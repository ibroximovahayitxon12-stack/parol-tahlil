// Vercel Serverless Function (Node.js) - Parol bardoshliligini tahlil qiluvchi funksiya
const crypto = require("crypto");

const OMMABOP = ["password","parol","qwerty","qwerty123","123456","12345678","123456789","1234567890","111111","000000","admin","admin123","letmein","welcome","iloveyou","abc123","password1","passw0rd","uzbekistan","toshkent","andijon","salom","salom123","parol123","12345","1q2w3e4r","qazwsx","asdfgh","zxcvbn"];

function normal(p) {
  return p.toLowerCase().replace(/0/g,"o").replace(/1/g,"i").replace(/3/g,"e")
          .replace(/4/g,"a").replace(/5/g,"s").replace(/7/g,"t").replace(/@/g,"a").replace(/\$/g,"s");
}

function tahlil(p) {
  let pool = 0;
  if (/[a-z]/.test(p)) pool += 26;
  if (/[A-Z]/.test(p)) pool += 26;
  if (/\d/.test(p)) pool += 10;
  if (/[^A-Za-z0-9]/.test(p)) pool += 33;
  let e = p.length * Math.log2(pool || 1);

  const muammo = [];
  if (p.length < 12) muammo.push("Kamida 12 ta belgi bo'lsin");
  if (/(.)\1{2,}/.test(p)) { muammo.push("Bir xil belgi takrorlangan (aaa)"); e *= 0.88; }
  if (/(abc|bcd|cde|123|234|345|456|567|678|789|qwe|wer|ert|asd|sdf|zxc)/i.test(p)) { muammo.push("Ketma-ket belgilar bor (abc, 123, qwe)"); e *= 0.85; }
  if (/(19|20)\d\d/.test(p)) { muammo.push("Yil ishlatilgan (1999, 2005)"); e *= 0.92; }
  if (!/[A-Z]/.test(p) || !/[a-z]/.test(p)) muammo.push("Bosh va kichik harflarni aralashtiring");
  if (!/\d/.test(p)) muammo.push("Raqam qo'shing");
  if (!/[^A-Za-z0-9]/.test(p)) muammo.push("Maxsus belgi qo'shing (!@#$)");

  if (OMMABOP.includes(p.toLowerCase()) || OMMABOP.includes(normal(p))) {
    muammo.unshift("Bu juda ommabop parol!");
    e = Math.min(e, 12);
  }
  return { e, muammo };
}

// k-anonymity: parolning faqat SHA-1 hash'ining dastlabki 5 belgisi tashqariga ketadi
async function oshkorSoni(p) {
  try {
    const h = crypto.createHash("sha1").update(p).digest("hex").toUpperCase();
    const r = await fetch("https://api.pwnedpasswords.com/range/" + h.slice(0, 5));
    const matn = await r.text();
    const q = matn.split("\n").find(l => l.startsWith(h.slice(5)));
    return q ? parseInt(q.split(":")[1]) : 0;
  } catch (e) { return -1; }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ xato: "Faqat POST" });
  let password = "";
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    password = String(b.password || "").slice(0, 128);
  } catch (e) {}

  const t = tahlil(password);
  const oshkor = password ? await oshkorSoni(password) : 0;
  if (oshkor > 0) {
    t.e = Math.min(t.e, 12);
    t.muammo.unshift("Bu parol ma'lumotlar sizib chiqishida topilgan (" + oshkor + " marta)!");
  }

  const e = Math.round(t.e);
  const ball = password.length < 8 ? Math.min(25, Math.round(e / 80 * 100)) : Math.min(100, Math.round(e / 80 * 100));
  const daraja = ball < 20 ? "Juda zaif" : ball < 40 ? "Zaif" : ball < 60 ? "O'rtacha" : ball < 80 ? "Kuchli" : "Juda kuchli";

  // Loglarga faqat anonim ma'lumot yoziladi (parolning o'zi EMAS)
  console.log(JSON.stringify({ uzunlik: password.length, entropiya: e, daraja, oshkor: oshkor > 0 }));

  res.status(200).json({ entropiya: e, ball, daraja, oshkorSoni: oshkor, muammolar: t.muammo });
};
