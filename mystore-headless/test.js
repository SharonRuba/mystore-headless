import { shopify } from "./src/shopify.js";

async function runTest() {
  // Replace with your real variant ID
  const variantId = "gid://shopify/ProductVariant/41936061759559";

  const mutation = `
    mutation CreateCart($variantId: ID!) {
      cartCreate(
        input: {
          lines: [{ merchandiseId: $variantId, quantity: 1 }]
        }
      ) {
        cart {
          id
          checkoutUrl
          lines(first: 5) {
            edges {
              node {
                id
                merchandise {
                  ... on ProductVariant {
                    title
                  }
                }
                quantity
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;


  
  try {
    const data = await shopify(mutation, { variantId });
    console.log("✅ Cart Created:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

runTest();
