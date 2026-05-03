export const calorieMap: Record<string, number> = {
  // Buns
  'sesame bun': 120,
  'brioche bun': 150,
  'whole wheat bun': 100,
  'lettuce wrap': 10,

  // Patties
  'beef patty': 280,
  'chicken patty': 220,
  'veggie patty': 150,
  'fish patty': 180,

  // Toppings
  'cheese': 80,
  'lettuce': 5,
  'tomato': 10,
  'onion': 15,
  'pickles': 5,
  'bacon': 120,
  'egg': 70,
  'avocado': 80,

  // Sauces
  'ketchup': 20,
  'mayonnaise': 90,
  'mustard': 10,
  'bbq sauce': 30,
  'hot sauce': 5,
};

export const getCalories = (ingredientName: string): number => {
  const key = ingredientName.toLowerCase();
  for (const [name, cal] of Object.entries(calorieMap)) {
    if (key.includes(name) || name.includes(key)) return cal;
  }
  return 50; // default
};
