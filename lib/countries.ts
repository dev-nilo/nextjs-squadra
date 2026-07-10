export interface CountryOption {
    code: string;
    name: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
    { code: "BR", name: "Brasil" },
    { code: "AR", name: "Argentina" },
    { code: "UY", name: "Uruguai" },
    { code: "CL", name: "Chile" },
    { code: "CO", name: "Colombia" },
    { code: "PY", name: "Paraguai" },
    { code: "PE", name: "Peru" },
    { code: "VE", name: "Venezuela" },
    { code: "EC", name: "Equador" },
    { code: "BO", name: "Bolivia" },
    { code: "MX", name: "Mexico" },
    { code: "US", name: "Estados Unidos" },
    { code: "CA", name: "Canada" },
    { code: "PT", name: "Portugal" },
    { code: "ES", name: "Espanha" },
    { code: "FR", name: "Franca" },
    { code: "DE", name: "Alemanha" },
    { code: "IT", name: "Italia" },
    { code: "NL", name: "Holanda" },
    { code: "GB", name: "Inglaterra" },
    { code: "AE", name: "Emirados Árabes" },
    { code: "IN", name: "Índia" },
    { code: "SA", name: "Arábia Saudita" },
];

export const DEFAULT_COUNTRY_CODE = "BR";

export const getCountryCode = (value: unknown): string => {
    if (typeof value !== "string") return DEFAULT_COUNTRY_CODE;
    const normalized = value.trim().toUpperCase();
    const exists = COUNTRY_OPTIONS.some((country) => country.code === normalized);
    return exists ? normalized : DEFAULT_COUNTRY_CODE;
};

export const getCountryName = (code: string): string => {
    const country = COUNTRY_OPTIONS.find((option) => option.code === code);
    return country?.name ?? "Brasil";
};

export const getFlagUrl = (code: string): string =>
    `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
