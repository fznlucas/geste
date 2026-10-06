/**
 * Name and address pools for simulated customers (docs/admin-v2/01 §2). Fictional people at real
 * city/postcode pairs; the street numbers and names are generic.
 */

type Pool = { first: string[]; last: string[]; cities: Array<[city: string, postcode: string]>; streets: string[] };

const FR: Pool = {
  first: ["Camille", "Léa", "Manon", "Chloé", "Inès", "Jade", "Louise", "Emma", "Alice", "Lina", "Juliette", "Zoé", "Clara", "Anna", "Sarah", "Lucie", "Margaux", "Pauline", "Elise", "Mathilde", "Hugo", "Lucas", "Louis", "Jules", "Arthur", "Adam", "Tom", "Paul", "Nathan", "Théo", "Raphaël", "Victor", "Antoine", "Maxime", "Yanis", "Noah", "Gabriel", "Sacha", "Simon", "Martin"],
  last: ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau", "Simon", "Laurent", "Lefebvre", "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent", "Fournier", "Morel", "Girard", "André", "Mercier", "Dupont", "Lambert", "Bonnet", "François", "Martinez", "Legrand", "Garnier", "Faure", "Rousseau", "Blanc", "Guerin", "Muller", "Henry", "Roussel", "Nicolas", "Perrin"],
  cities: [["Paris", "75011"], ["Paris", "75018"], ["Paris", "75005"], ["Lyon", "69003"], ["Lyon", "69007"], ["Marseille", "13006"], ["Bordeaux", "33000"], ["Nantes", "44000"], ["Lille", "59000"], ["Toulouse", "31000"], ["Montpellier", "34000"], ["Strasbourg", "67000"], ["Rennes", "35000"], ["Nice", "06000"], ["Grenoble", "38000"], ["Dijon", "21000"], ["Angers", "49000"], ["Tours", "37000"], ["Rouen", "76000"], ["Annecy", "74000"]],
  streets: ["rue de la République", "rue Victor Hugo", "avenue Jean Jaurès", "rue Pasteur", "boulevard Voltaire", "rue des Lilas", "rue du Moulin", "place de la Mairie", "rue Gambetta", "allée des Tilleuls"],
};

const BE: Pool = {
  first: ["Emma", "Louise", "Olivia", "Elena", "Alice", "Noah", "Arthur", "Louis", "Jules", "Victor", "Lucas", "Liam", "Marie", "Nora", "Lina"],
  last: ["Peeters", "Janssens", "Maes", "Jacobs", "Mertens", "Willems", "Claes", "Goossens", "Wouters", "Dubois", "Lambert", "Dupont", "Martin", "Simon", "Leclercq"],
  cities: [["Bruxelles", "1000"], ["Ixelles", "1050"], ["Liège", "4000"], ["Namur", "5000"], ["Gent", "9000"], ["Antwerpen", "2000"], ["Leuven", "3000"], ["Mons", "7000"]],
  streets: ["rue Haute", "avenue Louise", "rue de Namur", "chaussée de Wavre", "rue Royale"],
};

const CH: Pool = {
  first: ["Mia", "Emma", "Lena", "Léa", "Anna", "Noah", "Luca", "Liam", "Matteo", "Elias", "Nina", "Lara", "Julien", "Sophie", "Tim"],
  last: ["Müller", "Meier", "Schmid", "Keller", "Weber", "Huber", "Meyer", "Schneider", "Favre", "Rochat", "Bonvin", "Rossi", "Fischer", "Gerber", "Baumann"],
  cities: [["Genève", "1204"], ["Lausanne", "1003"], ["Zürich", "8004"], ["Bern", "3011"], ["Basel", "4051"], ["Neuchâtel", "2000"], ["Fribourg", "1700"], ["Sion", "1950"]],
  streets: ["rue du Stand", "avenue de Rumine", "Langstrasse", "rue de Bourg", "Bahnhofstrasse"],
};

const DE: Pool = {
  first: ["Mia", "Emma", "Hannah", "Lea", "Sophie", "Ben", "Paul", "Leon", "Finn", "Jonas", "Lena", "Felix", "Clara", "Max", "Lukas"],
  last: ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Koch", "Richter", "Klein", "Wolf", "Neumann"],
  cities: [["Berlin", "10115"], ["München", "80331"], ["Hamburg", "20095"], ["Köln", "50667"], ["Frankfurt am Main", "60311"], ["Leipzig", "04109"]],
  streets: ["Hauptstraße", "Schulstraße", "Gartenstraße", "Bahnhofstraße", "Lindenstraße"],
};

const US: Pool = {
  first: ["Olivia", "Emma", "Ava", "Sophia", "Mia", "Liam", "Noah", "Oliver", "James", "Elijah", "Grace", "Chloe", "Ethan", "Lily", "Henry"],
  last: ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson", "Anderson", "Taylor", "Moore", "Clark", "Lewis", "Walker", "Hall"],
  cities: [["New York, NY", "10003"], ["Brooklyn, NY", "11211"], ["Los Angeles, CA", "90026"], ["San Francisco, CA", "94110"], ["Chicago, IL", "60614"], ["Austin, TX", "78704"], ["Seattle, WA", "98122"], ["Portland, OR", "97214"]],
  streets: ["Main Street", "Oak Avenue", "Maple Street", "Park Avenue", "Elm Street"],
};

const GB: Pool = {
  first: ["Olivia", "Amelia", "Isla", "Ava", "Lily", "Oliver", "George", "Harry", "Noah", "Jack", "Freya", "Florence", "Arthur", "Alfie", "Evie"],
  last: ["Smith", "Jones", "Taylor", "Brown", "Williams", "Wilson", "Johnson", "Davies", "Robinson", "Wright", "Thompson", "Evans", "Walker", "White", "Hughes"],
  cities: [["London", "E8 3PB"], ["London", "N1 9GU"], ["Manchester", "M4 1HN"], ["Bristol", "BS1 4DJ"], ["Edinburgh", "EH1 1YZ"], ["Brighton", "BN1 1EE"]],
  streets: ["High Street", "Station Road", "Church Lane", "Victoria Road", "Mill Lane"],
};

const EU: Record<string, Pool> = {
  NL: { first: ["Emma", "Julia", "Sophie", "Daan", "Sem", "Lucas", "Tess", "Noor"], last: ["de Jong", "Jansen", "de Vries", "van den Berg", "Bakker", "Visser", "Smit", "Meijer"], cities: [["Amsterdam", "1015"], ["Utrecht", "3511"], ["Rotterdam", "3011"]], streets: ["Prinsengracht", "Oudegracht", "Witte de Withstraat"] },
  ES: { first: ["Lucía", "Martina", "Sofía", "Hugo", "Martín", "Pablo", "Julia", "Daniel"], last: ["García", "Rodríguez", "González", "Fernández", "López", "Martínez", "Sánchez", "Pérez"], cities: [["Madrid", "28004"], ["Barcelona", "08012"], ["Valencia", "46001"]], streets: ["Calle Mayor", "Calle de Verdi", "Gran Vía"] },
  IT: { first: ["Sofia", "Giulia", "Aurora", "Leonardo", "Francesco", "Alessandro", "Ginevra", "Lorenzo"], last: ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci"], cities: [["Milano", "20121"], ["Torino", "10123"], ["Bologna", "40121"]], streets: ["Via Roma", "Via Garibaldi", "Corso Italia"] },
};

export const NAME_POOLS: Record<string, Pool> = { FR, BE, CH, DE, US, GB, ...EU };

const locals = new Map<string, string>();

/** Accents out, spaces to dots: "Léa Dubois" → "lea.dubois". */
export function emailLocal(fullName: string): string {
  let v = locals.get(fullName);
  if (v === undefined) {
    v = toLocal(fullName);
    locals.set(fullName, v);
  }
  return v;
}

function toLocal(fullName: string): string {
  return fullName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .trim()
    .replace(/\s+/g, ".");
}

export const EMAIL_DOMAINS = ["mail.com", "gmail.com", "outlook.com", "icloud.com", "proton.me", "orange.fr", "free.fr"];
