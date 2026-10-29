export interface AfricanCountry {
  code: string;
  name: string;
  flag: string;
  flagUrl: string;
}

function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function country(code: string, name: string): AfricanCountry {
  const normalized = code.toLowerCase();
  return {
    code: normalized,
    name,
    flag: flagEmoji(code),
    flagUrl: `https://flagcdn.com/w80/${normalized}.png`,
  };
}

export const AFRICAN_COUNTRIES: AfricanCountry[] = [
  country("DZ", "Algeria"),
  country("AO", "Angola"),
  country("BJ", "Benin"),
  country("BW", "Botswana"),
  country("BF", "Burkina Faso"),
  country("BI", "Burundi"),
  country("CV", "Cabo Verde"),
  country("CM", "Cameroon"),
  country("CF", "Central African Republic"),
  country("TD", "Chad"),
  country("KM", "Comoros"),
  country("CG", "Congo"),
  country("CD", "DR Congo"),
  country("CI", "Côte d'Ivoire"),
  country("DJ", "Djibouti"),
  country("EG", "Egypt"),
  country("GQ", "Equatorial Guinea"),
  country("ER", "Eritrea"),
  country("SZ", "Eswatini"),
  country("ET", "Ethiopia"),
  country("GA", "Gabon"),
  country("GM", "Gambia"),
  country("GH", "Ghana"),
  country("GN", "Guinea"),
  country("GW", "Guinea-Bissau"),
  country("KE", "Kenya"),
  country("LS", "Lesotho"),
  country("LR", "Liberia"),
  country("LY", "Libya"),
  country("MG", "Madagascar"),
  country("MW", "Malawi"),
  country("ML", "Mali"),
  country("MR", "Mauritania"),
  country("MU", "Mauritius"),
  country("MA", "Morocco"),
  country("MZ", "Mozambique"),
  country("NA", "Namibia"),
  country("NE", "Niger"),
  country("NG", "Nigeria"),
  country("RW", "Rwanda"),
  country("ST", "São Tomé and Príncipe"),
  country("SN", "Senegal"),
  country("SC", "Seychelles"),
  country("SL", "Sierra Leone"),
  country("SO", "Somalia"),
  country("ZA", "South Africa"),
  country("SS", "South Sudan"),
  country("SD", "Sudan"),
  country("TZ", "Tanzania"),
  country("TG", "Togo"),
  country("TN", "Tunisia"),
  country("UG", "Uganda"),
  country("ZM", "Zambia"),
  country("ZW", "Zimbabwe"),
];

export function findAfricanCountry(name: string): AfricanCountry | undefined {
  const query = name.trim().toLowerCase();
  return AFRICAN_COUNTRIES.find(
    (item) => item.name.toLowerCase() === query || item.code === query,
  );
}
