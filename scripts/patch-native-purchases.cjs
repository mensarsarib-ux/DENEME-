// @capgo/native-purchases eklentisine iOS'ta telefondaki geçerli abonelikleri okuyan bir metot ekler
// (StoreKit Transaction.currentEntitlements). Eklentinin geri yüklemesi abonelik bilgisi döndürmediği için gerekir.
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
                            "productIdentifier": transaction.productID
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

let objc = fs.readFileSync(objcPath, "utf8");
if (!objc.includes("getCurrentEntitlements")) {
  const anchor = "        CAP_PLUGIN_METHOD(restorePurchases, CAPPluginReturnPromise);";
  if (!objc.includes(anchor)) throw new Error("native-purchases: restorePurchases kaydı bulunamadı");
  objc = objc.replace(anchor, anchor + "\n        CAP_PLUGIN_METHOD(getCurrentEntitlements, CAPPluginReturnPromise);");
  fs.writeFileSync(objcPath, objc);
}
