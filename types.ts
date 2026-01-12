
export enum SundaTheme {
  TEA_GARDEN = 'Kebun Teh (Tea Garden)',
  RICE_FIELD_SALAK = 'Sawah & Gunung Salak',
  WATERFALL = 'Curug (Waterfall)',
  RIVER = 'Sungai (River)',
  VILLAGE = 'Pedesaan (Village)',
  EIFFEL = 'Menara Eiffel (Paris)',
  LONDON = 'Big Ben (London)',
  FUJI = 'Gunung Fuji (Japan)',
  CHINA = 'Tembok Besar (Great Wall)',
  LIBERTY = 'Patung Liberty (Liberty)'
}

export enum Accessory {
  SUNGLASSES = 'Kaca Mata',
  HAT = 'Topi',
  PECI = 'Peci',
  CAPING = 'Caping',
  ANGKLUNG = 'Angklung',
  PANGSI = 'Baju Pangsi',
  JACKET = 'Jaket'
}

export interface GenerationHistory {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  type: 'generate' | 'edit';
  watermarkLogo?: string;
}

export interface AppState {
  isGenerating: boolean;
  currentImage: string | null;
  history: GenerationHistory[];
  error: string | null;
  watermarkLogo: string | null;
  selectedAccessories: Accessory[];
}
