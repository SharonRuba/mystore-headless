// src/shopify.js

const SHOPIFY_STORE_DOMAIN = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_API_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_API_TOKEN;
const API_VERSION = import.meta.env.VITE_SHOPIFY_API_VERSION || "2025-01";
const API_URL = `https://${SHOPIFY_STORE_DOMAIN}/api/${API_VERSION}/graphql.json`;

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

  if (!res.ok) throw new Error(`Network error: ${res.status} ${res.statusText}`);

  const json = await res.json();
  if (json.errors) {
    console.error("Shopify API Error:", json.errors);
    throw new Error(json.errors[0]?.message || "Shopify API request failed");
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
    const cart = data.cartCreate?.cart;

    if (cart?.id) {
      localStorage.setItem("shopify_cart_id", cart.id);
    }
    if (cart?.checkoutUrl) {
      localStorage.setItem("shopify_checkout_url", cart.checkoutUrl); // ✅ store URL
    }
    return cart;
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
    const cart = data.cartLinesAdd?.cart;

    if (cart?.checkoutUrl) {
      localStorage.setItem("shopify_checkout_url", cart.checkoutUrl); // ✅ update URL
    }
    return cart;
  }
}

// 🔎 Small helpers (optional but handy)
export const getCheckoutUrl = () => localStorage.getItem("shopify_checkout_url") || null;
export const getCartId = () => localStorage.getItem("shopify_cart_id") || null;
export const clearCart = () => {
  localStorage.removeItem("shopify_cart_id");
  localStorage.removeItem("shopify_checkout_url");
};
