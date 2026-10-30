// @capgo/native-purchases eklentisine iOS'ta iki şey ekler:
// 1) Telefondaki geçerli abonelikleri (hesap kimliğiyle) okuyan metot (StoreKit Transaction.currentEntitlements);
//    eklentinin geri yüklemesi abonelik bilgisi döndürmediği için gerekir.
// 2) Satın almaya hesap kimliği (appAccountToken) verilebilmesi; abonelik satın alan Hesabım hesabına bağlanır
//    ve sunucu, aboneliği başka bir hesabın ele geçirmesini engeller.
// npm install sonrasında çalışır; zaten ekliyse dokunmaz.
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "node_modules", "@capgo", "native-purchases", "ios", "Plugin");
const swiftPath = path.join(dir, "NativePurchasesPlugin.swift");
const objcPath = path.join(dir, "NativePurchasesPlugin.m");
if (!fs.existsSync(swiftPath) || !fs.existsSync(objcPath)) process.exit(0);

let swift = fs.readFileSync(swiftPath, "utf8");
if (!swift.includes("getCurrentEntitlements")) {
  const anchor = "    @objc func restorePurchases(_ call: CAPPluginCall) {";
  if (!swift.includes(anchor)) throw new Error("native-purchases: restorePurchases bulunamadı");
  const method = `    @objc func getCurrentEntitlements(_ call: CAPPluginCall) {
        if #available(iOS 15, *) {
            Task {
                var list: [[String: Any]] = []
                for await result in Transaction.currentEntitlements {
                    if case let .verified(transaction) = result {
                        list.append([
                            "transactionId": String(transaction.id),
                            "originalTransactionId": String(transaction.originalID),
                            "productIdentifier": transaction.productID,
                            "appAccountToken": transaction.appAccountToken?.uuidString ?? ""
                        ])
                    }
                }
                call.resolve(["entitlements": list])
            }
        } else {
            call.resolve(["entitlements": []])
        }
    }

`;
  swift = swift.replace(anchor, method + anchor);
  fs.writeFileSync(swiftPath, swift);
}

// Önceki yamada abonelikle birlikte hesap kimliği dönmüyordu; eklenir
if (swift.includes("getCurrentEntitlements") && !swift.includes("transaction.appAccountToken")) {
  const anchor = `"productIdentifier": transaction.productID
                        ])`;
  if (!swift.includes(anchor)) throw new Error("native-purchases: abonelik listesi bulunamadı");
  swift = swift.replace(anchor, `"productIdentifier": transaction.productID,
                            "appAccountToken": transaction.appAccountToken?.uuidString ?? ""
                        ])`);
  fs.writeFileSync(swiftPath, swift);
}

if (!swift.includes("PurchaseOption.appAccountToken")) {
  const anchor = "                    purchaseOptions.insert(Product.PurchaseOption.quantity(quantity))";
  if (!swift.includes(anchor)) throw new Error("native-purchases: satın alma seçenekleri bulunamadı");
  const token = `
                    if let token = call.getString("appAccountToken"), let uuid = UUID(uuidString: token) {
                        purchaseOptions.insert(Product.PurchaseOption.appAccountToken(uuid))
                    }`;
  swift = swift.replace(anchor, anchor + token);
  fs.writeFileSync(swiftPath, swift);
}

let objc = fs.readFileSync(objcPath, "utf8");
if (!objc.includes("getCurrentEntitlements")) {
  const anchor = "        CAP_PLUGIN_METHOD(restorePurchases, CAPPluginReturnPromise);";
  if (!objc.includes(anchor)) throw new Error("native-purchases: restorePurchases kaydı bulunamadı");
  objc = objc.replace(anchor, anchor + "\n        CAP_PLUGIN_METHOD(getCurrentEntitlements, CAPPluginReturnPromise);");
  fs.writeFileSync(objcPath, objc);
}
