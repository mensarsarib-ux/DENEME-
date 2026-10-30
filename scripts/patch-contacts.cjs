// @capacitor-community/contacts eklentisinin "rehberden seç" metodunu iOS'ta değiştirir:
// - Rehber izni istemeden Apple'ın kişi seçicisi açılır (seçici, yalnızca seçilen kişiyi uygulamaya verir).
// - Seçilen kişiden yalnızca ad, şirket, telefonlar ve e-postalar okunur (okunmayan alana erişip çökmesin).
// - Vazgeçilirse istek "cancelled" hatasıyla biter (aksi hâlde uygulama yanıt beklerken takılı kalır).
// npm install sonrasında çalışır; zaten değiştirildiyse dokunmaz.
const fs = require("fs");
const path = require("path");

const swiftPath = path.join(__dirname, "..", "node_modules", "@capacitor-community", "contacts", "ios", "Plugin", "ContactsPlugin.swift");
if (!fs.existsSync(swiftPath)) process.exit(0);

let swift = fs.readFileSync(swiftPath, "utf8");
if (swift.includes("HESABIM_PICKER")) process.exit(0);

const start = swift.indexOf("    @objc func pickContact(_ call: CAPPluginCall) {");
const end = swift.lastIndexOf("}");
if (start < 0 || end < start) throw new Error("contacts: pickContact bulunamadı");

const replacement = `    // HESABIM_PICKER: izin istemeyen kişi seçici
    @objc func pickContact(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.bridge?.saveCall(call)
            self.pickContactCallbackId = call.callbackId
            let contactPicker = CNContactPickerViewController()
            contactPicker.delegate = self
            self.bridge?.viewController?.present(contactPicker, animated: true)
        }
    }

    public func contactPicker(_ picker: CNContactPickerViewController, didSelect selectedContact: CNContact) {
        guard let call = self.bridge?.savedCall(withID: self.pickContactCallbackId ?? "") else { return }
        var given = ""
        var family = ""
        var organization = ""
        var phones: [String] = []
        var emails: [String] = []
        if selectedContact.isKeyAvailable(CNContactGivenNameKey) { given = selectedContact.givenName }
        if selectedContact.isKeyAvailable(CNContactFamilyNameKey) { family = selectedContact.familyName }
        if selectedContact.isKeyAvailable(CNContactOrganizationNameKey) { organization = selectedContact.organizationName }
        if selectedContact.isKeyAvailable(CNContactPhoneNumbersKey) {
            phones = selectedContact.phoneNumbers.map { $0.value.stringValue }
        }
        if selectedContact.isKeyAvailable(CNContactEmailAddressesKey) {
            emails = selectedContact.emailAddresses.map { String($0.value) }
        }
        call.resolve([
            "contact": [
                "name": ["given": given, "family": family],
                "organization": ["company": organization],
                "phones": phones.map { ["number": $0] },
                "emails": emails.map { ["address": $0] }
            ]
        ])
        self.bridge?.releaseCall(call)
    }

    public func contactPickerDidCancel(_ picker: CNContactPickerViewController) {
        guard let call = self.bridge?.savedCall(withID: self.pickContactCallbackId ?? "") else { return }
        call.reject("cancelled")
        self.bridge?.releaseCall(call)
    }
`;

swift = swift.slice(0, start) + replacement + swift.slice(end);
fs.writeFileSync(swiftPath, swift);
