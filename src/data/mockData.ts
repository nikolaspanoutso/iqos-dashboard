export interface Kiosk {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  stock: {
    iluma: {
      prime: number;
      one: number;
      standard: number;
    };
    accessories: number;
  };
  notes: string;
}

export const mockKiosks: Kiosk[] = [
  {
    id: "k1",
    name: "Kiosk Central Syntagma",
    lat: 37.9755,
    lng: 23.7348,
    address: "Syntagma Square 1",
    stock: {
      iluma: { prime: 5, one: 12, standard: 8 },
      accessories: 15
    },
    notes: "High traffic in mornings. Needs restocking of Prime Green."
  },
  {
    id: "k2",
    name: "Kiosk Kolonaki",
    lat: 37.9792,
    lng: 23.7441,
    address: "Patriarchou Ioakeim 12",
    stock: {
      iluma: { prime: 2, one: 5, standard: 4 },
      accessories: 8
    },
    notes: "VIP clients. Promote accessories."
  },
  {
    id: "k3",
    name: "Kiosk Monastiraki",
    lat: 37.9760,
    lng: 23.7255,
    address: "Monastiraki Square",
    stock: {
      iluma: { prime: 8, one: 20, standard: 15 },
      accessories: 30
    },
    notes: "Tourists. English brochures needed."
  }
];

export const teamStats = {
  monthlyGoal: 50000,
  currentSales: 32500,
  visitsScheduled: 12,
  visitsCompleted: 45
};

export const schedule = [
  { id: 1, time: "10:00", task: "Visit Kiosk Central", status: "Pending" },
  { id: 2, time: "13:00", task: "Restock Kolonaki", status: "Pending" },
  { id: 3, time: "16:00", task: "Team Meeting", status: "Confirmed" }
];
