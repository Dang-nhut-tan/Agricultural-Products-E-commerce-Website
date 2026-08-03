class ChatRespone {
  constructor(answer, products = [], recipe = null) {
    this.answer = answer;
    this.products = products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      oldprice: product.oldprice,
      image: product.image || product.ProductImages?.[0]?.image || "",
      quantity: product.quantity,
      unit: product.unit,
    }));
    this.recipe = recipe ? {
      name: recipe.name,
      ingredients: recipe.ingredients || [],
      steps: recipe.steps || [],
      missingIngredients: recipe.missingIngredients || [],
      safetyNotes: recipe.safetyNotes || [],
    } : null;
  }
}

module.exports = ChatRespone;
