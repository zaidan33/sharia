/** Batasan model PRD §11 - dinyatakan terbuka di halaman detail. */
export const CaveatList = [
  {
    title: "Tanpa nilai residu",
    body: "Valuasi berhenti di akhir tenor; aset yang masih produktif setelahnya tidak dihitung. NPV cenderung understated, terutama pada tenor pendek dengan aset berumur panjang.",
  },
  {
    title: "Tanpa pajak",
    body: "Seluruh arus kas dihitung sebelum pajak penghasilan badan.",
  },
  {
    title: "Tanpa modal kerja bergulir",
    body: "Perubahan piutang, persediaan, dan utang usaha tidak dimodelkan.",
  },
  {
    title: "Pertumbuhan deterministik",
    body: "Pendapatan tumbuh majemuk tanpa musiman. Untuk usaha dengan siklus panen atau musim ramai ini penyederhanaan yang cukup besar.",
  },
  {
    title: "Tanpa risiko gagal bayar",
    body: "Model mengasumsikan seluruh angsuran dibayar tepat waktu; tidak ada denda, restrukturisasi, atau grace period.",
  },
  {
    title: "EAR mengabaikan biaya di luar angsuran",
    body: "Biaya administrasi, asuransi/takaful, notaris, dan provisi tidak diperhitungkan. Dalam praktiknya bisa menggeser EAR beberapa poin persentase.",
  },
  {
    title: "Musyarakah mutanaqishah disederhanakan",
    body: "Pokok lurus ditambah imbal hasil atas sisa porsi kepemilikan. Skema riil dapat memakai porsi bagi hasil yang dinegosiasikan terpisah dari nisbah kepemilikan.",
  },
];
