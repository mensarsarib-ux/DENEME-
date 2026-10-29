import { deviceRegion } from "./region";

/** Ülkeler: [ISO kodu, Türkçe ad, alan kodu]. Öncelikli ülke Türkiye (+90). */
export const COUNTRIES: [string, string, string][] = [
  ["TR", "Türkiye", "90"], ["AF", "Afganistan", "93"], ["AL", "Arnavutluk", "355"], ["DZ", "Cezayir", "213"],
  ["AS", "Amerikan Samoası", "1684"], ["AD", "Andorra", "376"], ["AO", "Angola", "244"], ["AI", "Anguilla", "1264"],
  ["AG", "Antigua ve Barbuda", "1268"], ["AR", "Arjantin", "54"], ["AM", "Ermenistan", "374"], ["AW", "Aruba", "297"],
  ["AU", "Avustralya", "61"], ["AT", "Avusturya", "43"], ["AZ", "Azerbaycan", "994"], ["BS", "Bahamalar", "1242"],
  ["BH", "Bahreyn", "973"], ["BD", "Bangladeş", "880"], ["BB", "Barbados", "1246"], ["BY", "Belarus", "375"],
  ["BE", "Belçika", "32"], ["BZ", "Belize", "501"], ["BJ", "Benin", "229"], ["BM", "Bermuda", "1441"],
  ["BT", "Bhutan", "975"], ["BO", "Bolivya", "591"], ["BA", "Bosna-Hersek", "387"], ["BW", "Botsvana", "267"],
  ["BR", "Brezilya", "55"], ["IO", "Britanya Hint Okyanusu", "246"], ["VG", "Virgin Adaları (İngiltere)", "1284"],
  ["BN", "Brunei", "673"], ["BG", "Bulgaristan", "359"], ["BF", "Burkina Faso", "226"], ["BI", "Burundi", "257"],
  ["KH", "Kamboçya", "855"], ["CM", "Kamerun", "237"], ["CA", "Kanada", "1"], ["CV", "Yeşil Burun", "238"],
  ["KY", "Cayman Adaları", "1345"], ["CF", "Orta Afrika Cumhuriyeti", "236"], ["TD", "Çad", "235"], ["CL", "Şili", "56"],
  ["CN", "Çin", "86"], ["CX", "Christmas Adası", "61"], ["CC", "Cocos Adaları", "61"], ["CO", "Kolombiya", "57"],
  ["KM", "Komorlar", "269"], ["CG", "Kongo", "242"], ["CD", "Kongo DC", "243"], ["CK", "Cook Adaları", "682"],
  ["CR", "Kosta Rika", "506"], ["CI", "Fildişi Sahili", "225"], ["HR", "Hırvatistan", "385"], ["CU", "Küba", "53"],
  ["CW", "Curaçao", "599"], ["CY", "Kıbrıs", "357"], ["CZ", "Çekya", "420"], ["DK", "Danimarka", "45"],
  ["DJ", "Cibuti", "253"], ["DM", "Dominika", "1767"], ["DO", "Dominik Cumhuriyeti", "1809"], ["EC", "Ekvador", "593"],
  ["EG", "Mısır", "20"], ["SV", "El Salvador", "503"], ["GQ", "Ekvator Ginesi", "240"], ["ER", "Eritre", "291"],
  ["EE", "Estonya", "372"], ["SZ", "Esvatini", "268"], ["ET", "Etiyopya", "251"], ["FK", "Falkland Adaları", "500"],
  ["FO", "Faroe Adaları", "298"], ["FJ", "Fiji", "679"], ["FI", "Finlandiya", "358"], ["FR", "Fransa", "33"],
  ["GF", "Fransız Guyanası", "594"], ["PF", "Fransız Polinezyası", "689"], ["GA", "Gabon", "241"], ["GM", "Gambiya", "220"],
  ["GE", "Gürcistan", "995"], ["DE", "Almanya", "49"], ["GH", "Gana", "233"], ["GI", "Cebelitarık", "350"],
  ["GR", "Yunanistan", "30"], ["GL", "Grönland", "299"], ["GD", "Grenada", "1473"], ["GP", "Guadeloupe", "590"],
  ["GU", "Guam", "1671"], ["GT", "Guatemala", "502"], ["GG", "Guernsey", "44"], ["GN", "Gine", "224"],
  ["GW", "Gine-Bissau", "245"], ["GY", "Guyana", "592"], ["HT", "Haiti", "509"], ["HN", "Honduras", "504"],
  ["HK", "Hong Kong", "852"], ["HU", "Macaristan", "36"], ["IS", "İzlanda", "354"], ["IN", "Hindistan", "91"],
  ["ID", "Endonezya", "62"], ["IR", "İran", "98"], ["IQ", "Irak", "964"], ["IE", "İrlanda", "353"],
  ["IM", "Man Adası", "44"], ["IL", "İsrail", "972"], ["IT", "İtalya", "39"], ["JM", "Jamaika", "1876"],
  ["JP", "Japonya", "81"], ["JE", "Jersey", "44"], ["JO", "Ürdün", "962"], ["KZ", "Kazakistan", "7"],
  ["KE", "Kenya", "254"], ["KI", "Kiribati", "686"], ["XK", "Kosova", "383"], ["KW", "Kuveyt", "965"],
  ["KG", "Kırgızistan", "996"], ["LA", "Laos", "856"], ["LV", "Letonya", "371"], ["LB", "Lübnan", "961"],
  ["LS", "Lesotho", "266"], ["LR", "Liberya", "231"], ["LY", "Libya", "218"], ["LI", "Lihtenştayn", "423"],
  ["LT", "Litvanya", "370"], ["LU", "Lüksemburg", "352"], ["MO", "Makao", "853"], ["MG", "Madagaskar", "261"],
  ["MW", "Malavi", "265"], ["MY", "Malezya", "60"], ["MV", "Maldivler", "960"], ["ML", "Mali", "223"],
  ["MT", "Malta", "356"], ["MH", "Marshall Adaları", "692"], ["MQ", "Martinik", "596"], ["MR", "Moritanya", "222"],
  ["MU", "Mauritius", "230"], ["YT", "Mayotte", "262"], ["MX", "Meksika", "52"], ["FM", "Mikronezya", "691"],
  ["MD", "Moldova", "373"], ["MC", "Monako", "377"], ["MN", "Moğolistan", "976"], ["ME", "Karadağ", "382"],
  ["MS", "Montserrat", "1664"], ["MA", "Fas", "212"], ["MZ", "Mozambik", "258"], ["MM", "Myanmar", "95"],
  ["NA", "Namibya", "264"], ["NR", "Nauru", "674"], ["NP", "Nepal", "977"], ["NL", "Hollanda", "31"],
  ["NC", "Yeni Kaledonya", "687"], ["NZ", "Yeni Zelanda", "64"], ["NI", "Nikaragua", "505"], ["NE", "Nijer", "227"],
  ["NG", "Nijerya", "234"], ["NU", "Niue", "683"], ["NF", "Norfolk Adası", "672"], ["KP", "Kuzey Kore", "850"],
  ["MK", "Kuzey Makedonya", "389"], ["MP", "Kuzey Mariana Adaları", "1670"], ["NO", "Norveç", "47"], ["OM", "Umman", "968"],
  ["PK", "Pakistan", "92"], ["PW", "Palau", "680"], ["PS", "Filistin", "970"], ["PA", "Panama", "507"],
  ["PG", "Papua Yeni Gine", "675"], ["PY", "Paraguay", "595"], ["PE", "Peru", "51"], ["PH", "Filipinler", "63"],
  ["PL", "Polonya", "48"], ["PT", "Portekiz", "351"], ["PR", "Porto Riko", "1787"], ["QA", "Katar", "974"],
  ["RE", "Réunion", "262"], ["RO", "Romanya", "40"], ["RU", "Rusya", "7"], ["RW", "Ruanda", "250"],
  ["BL", "Saint-Barthélemy", "590"], ["SH", "Saint Helena", "290"], ["KN", "Saint Kitts ve Nevis", "1869"], ["LC", "Saint Lucia", "1758"],
  ["MF", "Saint-Martin", "590"], ["PM", "Saint-Pierre ve Miquelon", "508"], ["VC", "Saint Vincent", "1784"], ["WS", "Samoa", "685"],
  ["SM", "San Marino", "378"], ["ST", "São Tomé ve Príncipe", "239"], ["SA", "Suudi Arabistan", "966"], ["SN", "Senegal", "221"],
  ["RS", "Sırbistan", "381"], ["SC", "Seyşeller", "248"], ["SL", "Sierra Leone", "232"], ["SG", "Singapur", "65"],
  ["SX", "Sint Maarten", "1721"], ["SK", "Slovakya", "421"], ["SI", "Slovenya", "386"], ["SB", "Solomon Adaları", "677"],
  ["SO", "Somali", "252"], ["ZA", "Güney Afrika", "27"], ["KR", "Güney Kore", "82"], ["SS", "Güney Sudan", "211"],
  ["ES", "İspanya", "34"], ["LK", "Sri Lanka", "94"], ["SD", "Sudan", "249"], ["SR", "Surinam", "597"],
  ["SE", "İsveç", "46"], ["CH", "İsviçre", "41"], ["SY", "Suriye", "963"], ["TW", "Tayvan", "886"],
  ["TJ", "Tacikistan", "992"], ["TZ", "Tanzanya", "255"], ["TH", "Tayland", "66"], ["TL", "Doğu Timor", "670"],
  ["TG", "Togo", "228"], ["TK", "Tokelau", "690"], ["TO", "Tonga", "676"], ["TT", "Trinidad ve Tobago", "1868"],
  ["TN", "Tunus", "216"], ["TM", "Türkmenistan", "993"], ["TC", "Turks ve Caicos", "1649"], ["TV", "Tuvalu", "688"],
  ["VI", "Virgin Adaları (ABD)", "1340"], ["UG", "Uganda", "256"], ["UA", "Ukrayna", "380"], ["AE", "Birleşik Arap Emirlikleri", "971"],
  ["GB", "Birleşik Krallık", "44"], ["US", "Amerika Birleşik Devletleri", "1"], ["UY", "Uruguay", "598"], ["UZ", "Özbekistan", "998"],
  ["VU", "Vanuatu", "678"], ["VA", "Vatikan", "379"], ["VE", "Venezuela", "58"], ["VN", "Vietnam", "84"],
  ["WF", "Wallis ve Futuna", "681"], ["YE", "Yemen", "967"], ["ZM", "Zambiya", "260"], ["ZW", "Zimbabve", "263"],
];

/** Başta Türkiye (+90) olacak şekilde sıralı, tekrarsız alan kodları */
export const DIAL_CODES = COUNTRIES;

/** Telefonu "+ülke kodu numara" biçimine ayırır; eşleşmeyen olursa +90 kabul edilir */
export function splitPhone(value: string): { code: string; digits: string } {
  const raw = value.trim();
  if (raw.startsWith("+")) {
    const digitsAll = raw.replace(/\D/g, "");
    // En uzun eşleşen alan kodunu bul (ör. +1, +44, +90)
    const match = [...COUNTRIES]
      .sort((a, b) => b[2].length - a[2].length)
      .find(([, , code]) => digitsAll.startsWith(code));
    if (match) return { code: match[2], digits: digitsAll.slice(match[2].length) };
  }
  return { code: defaultDialCode(), digits: raw.replace(/\D/g, "").replace(/^0+/, "") };
}

/** Telefonun bölgesinin alan kodu (ör. Türkiye 90, Almanya 49); bilinmiyorsa 90 */
export function defaultDialCode(): string {
  const region = deviceRegion();
  return COUNTRIES.find(([iso]) => iso === region)?.[2] ?? "90";
}
