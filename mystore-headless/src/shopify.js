const SHOPIFY_STORE_DOMAIN = "ugy32n-we.myshopify.com";
const SHOPIFY_STOREFRONT_API_TOKEN = "50097394e3b49923044b5ee55335e9ae";
const API_URL = `https://${SHOPIFY_STORE_DOMAIN}/api/2025-01/graphql.json`;

// Base Shopify fetch function
export async function shopify(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_API_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Network error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors) {
    console.error("Shopify API Error:", json.errors);
    throw new Error(json.errors[0].message || "Shopify API request failed");
  }

  return json.data;
}

// ✅ Add item to cart (persisted via localStorage)
export async function addToCart(variantId, quantity = 1) {
  let cartId = localStorage.getItem("shopify_cart_id");

  if (!cartId) {
    // No cart yet → create a new one
    const mutation = `
      mutation CreateCart($variantId: ID!, $quantity: Int!) {
        cartCreate(
          input: { lines: [{ merchandiseId: $variantId, quantity: $quantity }] }
        ) {
          cart {
            id
            checkoutUrl
            lines(first: 10) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      product { title }
                      price { amount currencyCode }
                    }
                  }
                }
              }
            }
          }
          userErrors { field message }
        }
      }
    `;
    const data = await shopify(mutation, { variantId, quantity });
    cartId = data.cartCreate.cart.id;
    localStorage.setItem("shopify_cart_id", cartId);
    return data.cartCreate.cart;
  } else {
    // Cart exists → add line to it
    const mutation = `
      mutation AddLine($cartId: ID!, $variantId: ID!, $quantity: Int!) {
        cartLinesAdd(
          cartId: $cartId,
          lines: [{ merchandiseId: $variantId, quantity: $quantity }]
        ) {
          cart {
            id
            checkoutUrl
            lines(first: 10) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      product { title }
                      price { amount currencyCode }
                    }
                  }
                }
              }
            }
          }
          userErrors { field message }
        }
      }
    `;
    const data = await shopify(mutation, { cartId, variantId, quantity });
    return data.cartLinesAdd.cart;
  }
}
