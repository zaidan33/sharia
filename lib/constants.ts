/** Opsi pilihan untuk form skenario (PRD §7, sektor dari §11.1). */

export const SEKTOR_USAHA = [
  "Ritel",
  "Manufaktur",
  "Kesehatan",
  "Peternakan",
  "Perikanan",
  "Pertanian",
  "Jasa",
  "F&B",
  "Pendidikan",
  "Transportasi",
  "Pariwisata",
  "Properti",
  "Konstruksi",
  "Teknologi",
  "Lainnya",
] as const;

export const PROFIL_RISIKO = ["rendah", "sedang", "tinggi"] as const;

export const PROFIL_RISIKO_LABEL: Record<string, string> = {
  rendah: "Rendah",
  sedang: "Sedang",
  tinggi: "Tinggi",
};

export const JENIS_AKAD = [
  "murabahah",
  "ijarah",
  "musyarakah_mutanaqishah",
] as const;

export const JENIS_AKAD_LABEL: Record<string, string> = {
  murabahah: "Murabahah",
  ijarah: "Ijarah",
  musyarakah_mutanaqishah: "Musyarakah mutanaqishah",
};

export const BASIS_TINGKAT = ["flat", "efektif"] as const;

export const BASIS_TINGKAT_LABEL: Record<string, string> = {
  flat: "Flat",
  efektif: "Efektif",
};
