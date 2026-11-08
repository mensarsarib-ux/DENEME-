package ee.forgr.nativepurchases;

// Hesabım için düzenlenmiş sürüm (@capgo/native-purchases 6.0.42'nin Android tarafı).
// scripts/patch-native-purchases.cjs npm kurulumundan sonra bu dosyayı eklentinin yerine koyar.
// Neden: Google Play, Billing 7+ istiyor; eklenti 6.2.1 için yazılmıştı ve Billing 8 ile çalışırken
// enablePendingPurchases() ve onProductDetailsResponse(List) bulunamadığı için uygulama kapanıyordu
// (java.lang.NoSuchMethodError). Ayrıca:
//  - Abonelikte ürün (planIdentifier) ve temel plan (productIdentifier) doğru eşleşir.
//  - Başka bir abonelik varken alınan paket eskisinin yerine geçer (iki abonelik birden ücretlendirilmez).
//  - Satın alma Hesabım hesabına bağlanır (obfuscatedAccountId = appAccountToken).
//  - Vazgeçme "cancelled" diye bildirilir; Google bağlantısı kurulamazsa sonsuza dek beklenmez.
//  - Abonelikler tüketilmez (consume yalnızca tek seferlik ürünler içindir).

import android.util.Log;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryProductDetailsResult;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONArray;

@CapacitorPlugin(name = "NativePurchases")
public class NativePurchasesPlugin extends Plugin {

  public final String PLUGIN_VERSION = "0.0.25-hesabim";
  public static final String TAG = "NativePurchases";
  /** Google Play bağlantısı için en fazla bekleme süresi (saniye) */
  private static final int CONNECT_TIMEOUT_SECONDS = 15;
  private BillingClient billingClient;

  private synchronized void closeBillingClient() {
    if (billingClient != null) {
      try {
        billingClient.endConnection();
      } catch (Exception e) {
        Log.w(TAG, "endConnection", e);
      }
      billingClient = null;
    }
  }

  /** Satın alma onaylanmamışsa onaylar; onay bitince bağlantı kapanır. Abonelik tüketilmez. */
  private void finishPurchase(Purchase purchase) {
    BillingClient client = billingClient;
    if (client == null || purchase.isAcknowledged()) {
      closeBillingClient();
      return;
    }
    AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
      .setPurchaseToken(purchase.getPurchaseToken())
      .build();
    client.acknowledgePurchase(params, billingResult -> {
      Log.i(TAG, "onAcknowledgePurchaseResponse " + billingResult.getResponseCode());
      closeBillingClient();
    });
  }

  /**
   * Google Play bağlantısını kurar. Bağlantı kurulamazsa (Play Store yok, hesap yok, zaman aşımı)
   * call reddedilir ve false döner; true dönerse istemci kullanıma hazırdır.
   */
  private boolean initBillingClient(PluginCall purchaseCall, PluginCall call) {
    closeBillingClient();
    CountDownLatch ready = new CountDownLatch(1);
    AtomicBoolean ok = new AtomicBoolean(false);
    final String[] failure = { "Google Play bağlantısı kurulamadı" };
    BillingClient client = BillingClient.newBuilder(getContext())
      .setListener(
        new PurchasesUpdatedListener() {
          @Override
          public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
            int code = billingResult.getResponseCode();
            Log.i(TAG, "onPurchasesUpdated " + code);
            if (code == BillingClient.BillingResponseCode.OK && purchases != null && !purchases.isEmpty()) {
              handlePurchase(purchases.get(purchases.size() - 1), purchaseCall);
              return;
            }
            if (purchaseCall != null) {
              if (code == BillingClient.BillingResponseCode.USER_CANCELED) {
                purchaseCall.reject("Purchase cancelled by user");
              } else if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
                purchaseCall.reject("Item already owned (cancelled)");
              } else {
                purchaseCall.reject("Purchase failed: " + code + " " + billingResult.getDebugMessage());
              }
            }
            closeBillingClient();
          }
        }
      )
      .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
      .build();
    synchronized (this) {
      billingClient = client;
    }
    client.startConnection(
      new BillingClientStateListener() {
        @Override
        public void onBillingSetupFinished(BillingResult billingResult) {
          if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
            ok.set(true);
          } else {
            failure[0] = "Google Play: " + billingResult.getResponseCode() + " " + billingResult.getDebugMessage();
          }
          ready.countDown();
        }

        @Override
        public void onBillingServiceDisconnected() {
          ready.countDown();
        }
      }
    );
    try {
      if (!ready.await(CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)) failure[0] = "Google Play zaman aşımı";
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
    if (!ok.get()) {
      closeBillingClient();
      if (call != null) call.reject(failure[0]);
      return false;
    }
    return true;
  }

  private void handlePurchase(Purchase purchase, PluginCall purchaseCall) {
    int state = purchase.getPurchaseState();
    Log.i(TAG, "handlePurchase state=" + state);
    if (state == Purchase.PurchaseState.PURCHASED) {
      JSObject ret = new JSObject();
      ret.put("transactionId", purchase.getPurchaseToken());
      if (purchaseCall != null) purchaseCall.resolve(ret);
      finishPurchase(purchase);
    } else if (state == Purchase.PurchaseState.PENDING) {
      if (purchaseCall != null) purchaseCall.reject("Purchase is pending");
      closeBillingClient();
    } else {
      if (purchaseCall != null) purchaseCall.reject("Purchase is not purchased");
      closeBillingClient();
    }
  }

  @PluginMethod
  public void getPluginVersion(final PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("version", this.PLUGIN_VERSION);
    call.resolve(ret);
  }

  /** Abonelik için uygun teklif: istenen temel plan, yoksa ilk temel plan (indirim teklifi olmayan) */
  private static ProductDetails.SubscriptionOfferDetails pickOffer(ProductDetails details, String basePlanId) {
    List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
    if (offers == null || offers.isEmpty()) return null;
    ProductDetails.SubscriptionOfferDetails fallback = null;
    for (ProductDetails.SubscriptionOfferDetails offer : offers) {
      boolean basePlanOnly = offer.getOfferId() == null;
      if (basePlanId != null && offer.getBasePlanId().equals(basePlanId) && basePlanOnly) return offer;
      if (fallback == null && basePlanOnly) fallback = offer;
    }
    return fallback != null ? fallback : offers.get(0);
  }

  /**
   * Satın alma. Abonelikte planIdentifier = Play'deki abonelik kimliği (ör. pro.yearly),
   * productIdentifier = temel plan kimliği (ör. yearly). appAccountToken verilirse satın alma
   * bu hesaba bağlanır. Başka bir abonelik etkinse yeni paket onun yerine geçer.
   */
  @PluginMethod
  public void purchaseProduct(PluginCall call) {
    String productIdentifier = call.getString("productIdentifier");
    String planIdentifier = call.getString("planIdentifier");
    String productType = call.getString("productType", "inapp");
    String accountToken = call.getString("appAccountToken");
    if (productIdentifier == null || productIdentifier.isEmpty()) {
      call.reject("productIdentifier is empty");
      return;
    }
    boolean subs = "subs".equals(productType);
    if (subs && (planIdentifier == null || planIdentifier.isEmpty())) {
      call.reject("planIdentifier cannot be empty if productType is subs");
      return;
    }
    final String productId = subs ? planIdentifier : productIdentifier;
    QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
      .setProductList(
        Collections.singletonList(
          QueryProductDetailsParams.Product.newBuilder()
            .setProductId(productId)
            .setProductType(subs ? BillingClient.ProductType.SUBS : BillingClient.ProductType.INAPP)
            .build()
        )
      )
      .build();
    if (!initBillingClient(call, call)) return;
    final BillingClient client = billingClient;
    client.queryProductDetailsAsync(params, (BillingResult billingResult, QueryProductDetailsResult result) -> {
      List<ProductDetails> list = result != null ? result.getProductDetailsList() : null;
      if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || list == null || list.isEmpty()) {
        closeBillingClient();
        call.reject("Product not found: " + productId + " (" + billingResult.getResponseCode() + ")");
        return;
      }
      ProductDetails details = list.get(0);
      BillingFlowParams.ProductDetailsParams.Builder item = BillingFlowParams.ProductDetailsParams.newBuilder()
        .setProductDetails(details);
      if (subs) {
        ProductDetails.SubscriptionOfferDetails offer = pickOffer(details, productIdentifier);
        if (offer == null) {
          closeBillingClient();
          call.reject("No subscription offer for " + productId);
          return;
        }
        item.setOfferToken(offer.getOfferToken());
      }
      final BillingFlowParams.ProductDetailsParams productParams = item.build();
      if (!subs) {
        launch(client, call, productParams, accountToken, null);
        return;
      }
      // Etkin başka bir abonelik varsa yeni paket onun yerine geçer (yükseltme; kalan süre hesaba katılır)
      client.queryPurchasesAsync(
        QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),
        (BillingResult purchasesResult, List<Purchase> owned) -> {
          String oldToken = null;
          if (purchasesResult.getResponseCode() == BillingClient.BillingResponseCode.OK && owned != null) {
            for (Purchase p : owned) {
              if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED && !p.getProducts().contains(productId)) {
                oldToken = p.getPurchaseToken();
                break;
              }
            }
          }
          launch(client, call, productParams, accountToken, oldToken);
        }
      );
    });
  }

  private void launch(
    BillingClient client,
    PluginCall call,
    BillingFlowParams.ProductDetailsParams productParams,
    String accountToken,
    String oldPurchaseToken
  ) {
    BillingFlowParams.Builder flow = BillingFlowParams.newBuilder()
      .setProductDetailsParamsList(Collections.singletonList(productParams));
    if (accountToken != null && !accountToken.isEmpty()) flow.setObfuscatedAccountId(accountToken);
    if (oldPurchaseToken != null) {
      flow.setSubscriptionUpdateParams(
        BillingFlowParams.SubscriptionUpdateParams.newBuilder()
          .setOldPurchaseToken(oldPurchaseToken)
          .setSubscriptionReplacementMode(BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.WITH_TIME_PRORATION)
          .build()
      );
    }
    getActivity().runOnUiThread(() -> {
      BillingResult launched = client.launchBillingFlow(getActivity(), flow.build());
      Log.i(TAG, "launchBillingFlow " + launched.getResponseCode());
      if (launched.getResponseCode() != BillingClient.BillingResponseCode.OK) {
        closeBillingClient();
        call.reject("Purchase failed: " + launched.getResponseCode() + " " + launched.getDebugMessage());
      }
    });
  }

  /**
   * Bu Google hesabındaki aktif abonelik satın almaları (purchaseToken, ürün, hesap kimliği).
   * Uygulama "zaten abonesiniz" durumunda ve geri yüklemede sunucuya bu numarayı gönderir.
   */
  @PluginMethod
  public void getSubscriptionPurchases(PluginCall call) {
    if (!initBillingClient(null, call)) return;
    billingClient.queryPurchasesAsync(
      QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),
      (BillingResult billingResult, List<Purchase> purchases) -> {
        JSONArray out = new JSONArray();
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
          for (Purchase p : purchases) {
            if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
            JSObject item = new JSObject();
            item.put("transactionId", p.getPurchaseToken());
            item.put("productIdentifier", p.getProducts().isEmpty() ? "" : p.getProducts().get(0));
            item.put("appAccountToken", p.getAccountIdentifiers() != null ? p.getAccountIdentifiers().getObfuscatedAccountId() : "");
            out.put(item);
          }
        }
        closeBillingClient();
        JSObject ret = new JSObject();
        ret.put("purchases", out);
        call.resolve(ret);
      }
    );
  }

  /** Onaylanmamış satın almaları onaylar (abonelikler tüketilmez) */
  @PluginMethod
  public void restorePurchases(PluginCall call) {
    if (!initBillingClient(null, call)) return;
    final BillingClient client = billingClient;
    client.queryPurchasesAsync(
      QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),
      (BillingResult billingResult, List<Purchase> purchases) -> {
        boolean pending = false;
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
          for (Purchase p : purchases) {
            if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED && !p.isAcknowledged()) {
              pending = true;
              finishPurchase(p);
            }
          }
        }
        if (!pending) closeBillingClient();
        call.resolve();
      }
    );
  }

  private void queryProductDetails(List<String> productIdentifiers, String productType, PluginCall call) {
    boolean subs = "subs".equals(productType);
    List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
    for (String id : productIdentifiers) {
      productList.add(
        QueryProductDetailsParams.Product.newBuilder()
          .setProductId(id)
          .setProductType(subs ? BillingClient.ProductType.SUBS : BillingClient.ProductType.INAPP)
          .build()
      );
    }
    QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder().setProductList(productList).build();
    if (!initBillingClient(null, call)) return;
    billingClient.queryProductDetailsAsync(params, (BillingResult billingResult, QueryProductDetailsResult result) -> {
      List<ProductDetails> list = result != null ? result.getProductDetailsList() : null;
      if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || list == null || list.isEmpty()) {
        closeBillingClient();
        call.reject("Product not found (" + billingResult.getResponseCode() + ")");
        return;
      }
      JSONArray products = new JSONArray();
      for (ProductDetails details : list) {
        JSObject product = new JSObject();
        product.put("title", details.getName());
        product.put("description", details.getDescription());
        if (!subs) {
          ProductDetails.OneTimePurchaseOfferDetails offer = details.getOneTimePurchaseOfferDetails();
          if (offer == null) continue;
          product.put("identifier", details.getProductId());
          product.put("price", offer.getPriceAmountMicros() / 1000000.0);
          product.put("priceString", offer.getFormattedPrice());
          product.put("currencyCode", offer.getPriceCurrencyCode());
        } else {
          ProductDetails.SubscriptionOfferDetails offer = pickOffer(details, null);
          if (offer == null || offer.getPricingPhases().getPricingPhaseList().isEmpty()) continue;
          ProductDetails.PricingPhase phase = offer.getPricingPhases().getPricingPhaseList().get(0);
          // planIdentifier: abonelik kimliği (pro.yearly); identifier: temel plan (yearly)
          product.put("planIdentifier", details.getProductId());
          product.put("identifier", offer.getBasePlanId());
          product.put("price", phase.getPriceAmountMicros() / 1000000.0);
          product.put("priceString", phase.getFormattedPrice());
          product.put("currencyCode", phase.getPriceCurrencyCode());
        }
        product.put("isFamilyShareable", false);
        products.put(product);
      }
      JSObject ret = new JSObject();
      ret.put("products", products);
      closeBillingClient();
      call.resolve(ret);
    });
  }

  @PluginMethod
  public void getProducts(PluginCall call) {
    JSONArray ids = call.getArray("productIdentifiers");
    String productType = call.getString("productType", "inapp");
    if (ids == null || ids.length() == 0) {
      call.reject("productIdentifiers array missing");
      return;
    }
    List<String> productIdentifiers = new ArrayList<>();
    for (int i = 0; i < ids.length(); i++) productIdentifiers.add(ids.optString(i, ""));
    queryProductDetails(productIdentifiers, productType, call);
  }

  @PluginMethod
  public void getProduct(PluginCall call) {
    String productIdentifier = call.getString("productIdentifier");
    String productType = call.getString("productType", "inapp");
    if (productIdentifier == null || productIdentifier.isEmpty()) {
      call.reject("productIdentifier is empty");
      return;
    }
    queryProductDetails(Collections.singletonList(productIdentifier), productType, call);
  }
}
