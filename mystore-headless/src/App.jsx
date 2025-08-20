import { useEffect, useState } from "react";
import { shopify } from "./shopify";

function App() {
  const [products, setProducts] = useState([]);
  const [cartId, setCartId] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);

  // 🔹 Create (or resume) cart on first load
  useEffect(() => {
    const savedCartId = localStorage.getItem("shopify_cart_id");
    const savedCheckoutUrl = localStorage.getItem("shopify_checkout_url");

    if (savedCartId && savedCheckoutUrl) {
      setCartId(savedCartId);
      setCheckoutUrl(savedCheckoutUrl);
      return;
    }

    (async function createCart() {
      const mutation = `
        mutation {
          cartCreate {
            cart {
              id
              checkoutUrl
            }
          }
        }
      `;
      const data = await shopify(mutation);
      const id = data?.cartCreate?.cart?.id || null;
      const url = data?.cartCreate?.cart?.checkoutUrl || null;

      if (id) {
        setCartId(id);
        localStorage.setItem("shopify_cart_id", id);
      }
      if (url) {
        setCheckoutUrl(url);
        localStorage.setItem("shopify_checkout_url", url);
      }
    })();
  }, []);

  // 🔹 Fetch products
  useEffect(() => {
    async function fetchProducts() {
      const query = `
        query {
          products(first: 8) {
            edges {
              node {
                id
                title
                description
                images(first: 1) {
                  edges {
                    node {
                      src
                      altText
                    }
                  }
                }
                variants(first: 1) {
                  edges {
                    node {
                      id
                      title
                      price {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;
      const data = await shopify(query);
      setProducts(data.products.edges);
    }
    fetchProducts();
  }, []);

  // 🔹 Add item to current cart
  const addToCart = async (variantId) => {
    // if cartId somehow missing, create a fresh cart first
    let id = cartId;
    if (!id) {
      const create = await shopify(`
        mutation { cartCreate { cart { id checkoutUrl } } }
      `);
      id = create?.cartCreate?.cart?.id;
      const url = create?.cartCreate?.cart?.checkoutUrl;
      if (id) {
        setCartId(id);
        localStorage.setItem("shopify_cart_id", id);
      }
      if (url) {
        setCheckoutUrl(url);
        localStorage.setItem("shopify_checkout_url", url);
      }
      if (!id) return;
    }

    const mutation = `
      mutation addToCart($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart {
            id
            checkoutUrl
            lines(first: 10) {
              edges {
                node {
                  id
                  merchandise { ... on ProductVariant { title } }
                  quantity
                }
              }
            }
          }
          userErrors { field message }
        }
      }
    `;
    const data = await shopify(mutation, {
      cartId: id,
      lines: [{ merchandiseId: variantId, quantity: 1 }],
    });

    const url = data?.cartLinesAdd?.cart?.checkoutUrl;
    if (url) {
      setCheckoutUrl(url);
      localStorage.setItem("shopify_checkout_url", url);
    }

    alert("✅ Item added to cart!");
  };

  // 🔹 Per-card Checkout (Buy Now): create a 1-item cart and redirect
  const buyNow = async (variantId) => {
    const mutation = `
      mutation CreateCart($variantId: ID!) {
        cartCreate(input: { lines: [{ merchandiseId: $variantId, quantity: 1 }] }) {
          cart { checkoutUrl }
          userErrors { message }
        }
      }
    `;
    const data = await shopify(mutation, { variantId });
    const url = data?.cartCreate?.cart?.checkoutUrl;
    if (url) {
      window.location.href = url;
    } else {
      alert("Could not start checkout. Try again.");
    }
  };

  // 🔹 Global checkout button (uses saved checkoutUrl)
  const checkout = () => {
    const url = checkoutUrl || localStorage.getItem("shopify_checkout_url");
    if (url) window.location.href = url;
    else alert("Your cart is empty. Add an item first.");
  };

  return (
    <div className="product-grid">
      {products.map(({ node }) => (
        <div key={node.id} className="product-card">
          {node.images.edges.length > 0 && (
            <img
              src={node.images.edges[0].node.src}
              alt={node.images.edges[0].node.altText || node.title}
            />
          )}

          <h2 className="text-lg font-semibold mb-1">{node.title}</h2>

          <p className="product-desc">{node.description}</p>

          <p className="text-green-700 font-bold mb-3">
            {node.variants.edges[0].node.price.amount}{" "}
            {node.variants.edges[0].node.price.currencyCode}
          </p>

          <div className="actions">
            <button
              onClick={() => addToCart(node.variants.edges[0].node.id)}
              className="btn"
            >
              Add to Cart
            </button>

            <button
              onClick={() => buyNow(node.variants.edges[0].node.id)}
              className="btn"
              style={{ backgroundColor: "#16a34a" }}
            >
              Buy Now
            </button>
          </div>
        </div>
      ))}

     
    </div>
  );
}

export default App;
