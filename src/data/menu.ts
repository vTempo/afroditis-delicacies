// src/data/menu.ts
export interface MenuItem {
    category: string;
    name: string;
    isTopSeller: boolean;
    price: number;
    secondPrice?: number;
}

export const menuData: MenuItem[] = [
    {
        "category": "Traditional Greek Pies",
        "name": "Greek Traditional Spinach pie, with feta cheese",
        "isTopSeller": true,
        "price": 80,
        "secondPrice": 70
    },
    {
        "category": "Traditional Greek Pies",
        "name": "Zucchini pie, with feta cheese",
        "isTopSeller": false,
        "price": 80,
        "secondPrice": 70
    },
    {
        "category": "Traditional Greek Pies",
        "name": "Chicken pie",
        "isTopSeller": false,
        "price": 80,
        "secondPrice": 70
    },
    {
        "category": "Traditional Greek Pies",
        "name": "Meat pie, organic ground beef",
        "isTopSeller": false,
        "price": 80,
        "secondPrice": 70
    },
    {
        "category": "Traditional Greek Pies",
        "name": "Cheese pie or cheese bites with Feta and Asiago or Manchego",
        "isTopSeller": true,
        "price": 85,
        "secondPrice": 75
    },
    {
        "category": "Traditional Greek Pies",
        "name": "Pastourma pie",
        "isTopSeller": false,
        "price": 80,
        "secondPrice": 70
    },
    {
        "category": "Beef Dishes",
        "name": "Pastitsio",
        "isTopSeller": true,
        "price": 90,
        "secondPrice": 80
    },
    {
        "category": "Beef Dishes",
        "name": "Mousakas",
        "isTopSeller": true,
        "price": 90,
        "secondPrice": 80
    },
    {
        "category": "Beef Dishes",
        "name": "Lahanodolmades (cabbage dolma with ground beef) 50pc/25pc",
        "isTopSeller": false,
        "price": 90,
        "secondPrice": 80
    },
    {
        "category": "Beef Dishes",
        "name": "Soutzoukakia with rice or mashed potatoes",
        "isTopSeller": false,
        "price": 80
    },
    {
        "category": "Beef Dishes",
        "name": "Giouvetsi (Organic beef with orzo)",
        "isTopSeller": true,
        "price": 125
    },
    {
        "category": "Beef Dishes",
        "name": "Keftedakia (small meatballs)",
        "isTopSeller": true,
        "price": 70
    },
    {
        "category": "Beef Dishes",
        "name": "Keftedakia with Wagyu Beef",
        "isTopSeller": false,
        "price": 85
    },
    {
        "category": "Pork Dishes",
        "name": "Kebab kit: 8 Kebabs (organic ground beef and pork) with Pita and tzatziki",
        "isTopSeller": false,
        "price": 115
    },
    {
        "category": "Pork Dishes",
        "name": "Pork with Celery avgolemono (χοιρινό με σέλινο)",
        "isTopSeller": false,
        "price": 90
    },
    {
        "category": "Pork Dishes",
        "name": "Roasted pork leg with potatoes",
        "isTopSeller": false,
        "price": 95
    },
    {
        "category": "Chicken Dishes",
        "name": "Chicken Marbella",
        "isTopSeller": false,
        "price": 76
    },
    {
        "category": "Chicken Dishes",
        "name": "Farmers' market, free-range rooster with pasta in wine sauce (Κόκορας Κρασάτος με χοντρό μακαρόνι Misko)-large tray",
        "isTopSeller": false,
        "price": 100
    },
    {
        "category": "Chicken Dishes",
        "name": "Roasted organic chicken with okra (tray)",
        "isTopSeller": false,
        "price": 76
    },
    {
        "category": "Chicken Dishes",
        "name": "Giouvetsi (Organic chicken with orzo)",
        "isTopSeller": false,
        "price": 76
    },
    {
        "category": "Chicken Dishes",
        "name": "Organic chicken with artichokes and bell peppers (tray)",
        "isTopSeller": false,
        "price": 76
    },
    {
        "category": "Lamb Dishes",
        "name": "Roasted organic leg of lamb with potatoes (tray) (Local, fresh, bone-in lamb leg)",
        "isTopSeller": false,
        "price": 160
    },
    {
        "category": "Lamb Dishes",
        "name": "Lamb Fricassee with artichoke (tray)",
        "isTopSeller": false,
        "price": 130
    },
    {
        "category": "Lamb Dishes",
        "name": "Lamb Kleftiko (Lamb Cooked In Parchment Paper) with Kefalotyri",
        "isTopSeller": false,
        "price": 130
    },
    {
        "category": "Lamb Dishes",
        "name": "Giouvetsi (Lamb with orzo)",
        "isTopSeller": true,
        "price": 100
    },
    {
        "category": "Seafood Dishes",
        "name": "Pasta shells with spinach, feta cheese and shrimp",
        "isTopSeller": false,
        "price": 85
    },
    {
        "category": "Seafood Dishes",
        "name": "Octopus with penne",
        "isTopSeller": false,
        "price": 85
    },
    {
        "category": "Seafood Dishes",
        "name": "Garides (Shrimp) saganaki with feta cheese",
        "isTopSeller": false,
        "price": 85
    },
    {
        "category": "Seafood Dishes",
        "name": "Mediterranean seabass Risotto or Orzo",
        "isTopSeller": false,
        "price": 85
    },
    {
        "category": "Vegetarian Dishes",
        "name": "Dolmadakia (stuffed grape leaves)",
        "isTopSeller": false,
        "price": 76
    },
    {
        "category": "Vegetarian Dishes",
        "name": "Gemista – (Stuffed tomatoes, peppers, eggplants)",
        "isTopSeller": true,
        "price": 80
    },
    {
        "category": "Vegetarian Dishes",
        "name": "Gigantes (Greek giant baked beans – 6 portions per order)",
        "isTopSeller": false,
        "price": 55
    },
    {
        "category": "Vegetarian Dishes",
        "name": "Briam – Ratatouille (family size tray)",
        "isTopSeller": false,
        "price": 80
    },
    {
        "category": "Vegetarian Dishes",
        "name": "Green long beans (family size tray)",
        "isTopSeller": false,
        "price": 70
    },
    {
        "category": "Vegetarian Dishes",
        "name": "Kolokitho-keftedes (Zucchini Fritters)",
        "isTopSeller": false,
        "price": 55
    },
    {
        "category": "Vegetarian Dishes",
        "name": "Pasta shells with spinach and feta cheese",
        "isTopSeller": false,
        "price": 65
    },
    {
        "category": "Vegetarian Dishes",
        "name": "Fava",
        "isTopSeller": false,
        "price": 38
    },
    {
        "category": "Salads",
        "name": "Family size tray of Greek salad",
        "isTopSeller": false,
        "price": 65
    },
    {
        "category": "Salads",
        "name": "Afroditi's Special Salad",
        "isTopSeller": true,
        "price": 80
    },
    {
        "category": "Salads",
        "name": "Mediterranean Orzo Salad",
        "isTopSeller": false,
        "price": 65
    },
    {
        "category": "Salads",
        "name": "Tabbouleh Salad",
        "isTopSeller": false,
        "price": 50
    },
    {
        "category": "Salads",
        "name": "Zucchini, Lentils salad with Haloumi and Greek yogurt",
        "isTopSeller": false,
        "price": 60
    },
    {
        "category": "Salads",
        "name": "Lentils, Eggplants Salad with Yogurt",
        "isTopSeller": false,
        "price": 55
    },
    {
        "category": "Salads",
        "name": "Tirokauteri (mildly spicy cheese spread) (500 gr)",
        "isTopSeller": true,
        "price": 38
    },
    {
        "category": "Salads",
        "name": "Tzatziki (500 gr)",
        "isTopSeller": true,
        "price": 38
    },
    {
        "category": "Salads",
        "name": "Eggplant salad",
        "isTopSeller": false,
        "price": 38
    },
    {
        "category": "Salads",
        "name": "Fava",
        "isTopSeller": false,
        "price": 38
    },
    {
        "category": "Salads",
        "name": "Garbanzo beans salad",
        "isTopSeller": false,
        "price": 54
    },
    {
        "category": "Desserts",
        "name": "Orange pie (24 pieces)",
        "isTopSeller": true,
        "price": 80
    },
    {
        "category": "Desserts",
        "name": "Galaktompoureko (24 pieces)",
        "isTopSeller": false,
        "price": 86
    },
    {
        "category": "Desserts",
        "name": "Baklavas (24 pieces)",
        "isTopSeller": true,
        "price": 80
    },
    {
        "category": "Desserts",
        "name": "Kataifi (24 pieces)",
        "isTopSeller": false,
        "price": 86
    },
    {
        "category": "Desserts",
        "name": "Ekmek Kataifi (24 pieces)",
        "isTopSeller": true,
        "price": 95
    },
    {
        "category": "Desserts",
        "name": "Melomakarona 1 Kg ~35 pieces",
        "isTopSeller": false,
        "price": 76
    },
    {
        "category": "Desserts",
        "name": "Kourampiedes 1 Kg ~35 pieces",
        "isTopSeller": false,
        "price": 76
    },
    {
        "category": "Desserts",
        "name": "Tsoureki (plain or with chocolate)",
        "isTopSeller": true,
        "price": 43
    },
    {
        "category": "Dishes/Appetizers",
        "name": "Little spinach pie bites",
        "isTopSeller": false,
        "price": 80
    },
    {
        "category": "Dishes/Appetizers",
        "name": "Little meat/sausage pies",
        "isTopSeller": false,
        "price": 80
    },
    {
        "category": "Dishes/Appetizers",
        "name": "Little cheese bites",
        "isTopSeller": false,
        "price": 85
    },
    {
        "category": "Dishes/Appetizers",
        "name": "Dolmadakia with tzatziki and sliced pita bread party tray",
        "isTopSeller": true,
        "price": 125
    },
    {
        "category": "Dishes/Appetizers",
        "name": "Small Kebabs on Skewers (organic ground beef and pork, 35 pcs)",
        "isTopSeller": false,
        "price": 85
    },
    {
        "category": "Dishes/Appetizers",
        "name": "Skewers with Keftedakia, Haloumi cheese and tomato",
        "isTopSeller": false,
        "price": 105
    },
    {
        "category": "Dishes/Appetizers",
        "name": "Beef bites eggplant roles",
        "isTopSeller": false,
        "price": 105
    },
    {
        "category": "Dishes/Appetizers",
        "name": "Tirokauteri (mildly spicy cheese spread) (500 gr)",
        "isTopSeller": true,
        "price": 38
    },
    {
        "category": "Dishes/Appetizers",
        "name": "Tzatziki (500 gr)",
        "isTopSeller": true,
        "price": 38
    },
    {
        "category": "Dishes/Appetizers",
        "name": "Family size tray of Greek salad",
        "isTopSeller": true,
        "price": 65
    },
    {
        "category": "Dishes/Appetizers",
        "name": "Beetroot Salad",
        "isTopSeller": false,
        "price": 54
    },
    {
        "category": "Dishes/Appetizers",
        "name": "Eggplant Salad",
        "isTopSeller": false,
        "price": 48
    },
    {
        "category": "Dishes/Appetizers",
        "name": "Sliced Pitta Bread with Paprika",
        "isTopSeller": false,
        "price": 22
    },
    {
        "category": "Dishes/Appetizers",
        "name": "Pile of small Tuna sandwiches (Μπόμπα)",
        "isTopSeller": false,
        "price": 97
    }
];

export const categories = [
    "Full Menu",
    "Traditional Greek Pies",
    "Beef Dishes",
    "Pork Dishes",
    "Chicken Dishes",
    "Lamb Dishes",
    "Seafood Dishes",
    "Vegetarian Dishes",
    "Salads",
    "Desserts",
    "Dishes/Appetizers"
];

export const menuNote = "All dishes are based on traditional Greek recipes. Prepared with the same ingredients I am using for my family. Organic meats, eggs and vegetables. Greek Feta Cheese \"Epiros\" or \"Kolios\", Greek Olive oil \"Ariadne Pure\" and Greek spices. Please note that Baklava contains nuts. Also, most foods contain cheese.";