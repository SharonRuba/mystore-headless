import { useEffect, useState } from "react";
import { shopify } from "./shopify";

function App() {
  const [products, setProducts] = useState([]);
  const [cartId, setCartId] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);

  // 🔹 Create cart on first load
  useEffect(() => {
    async function createCart() {
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
      setCartId(data.cartCreate.cart.id);
      setCheckoutUrl(data.cartCreate.cart.checkoutUrl);
    }
    createCart();
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

  // 🔹 Add item to cart
  const addToCart = async (variantId) => {
    if (!cartId) return;

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
        }
      }
    `;
    await shopify(mutation, {
      cartId,
      lines: [{ merchandiseId: variantId, quantity: 1 }],
    });

    alert("✅ Item added to cart!");
  };

  // 🔹 Redirect to Shopify checkout
  const checkout = () => {
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    }
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-4 gap-6">
        {products.map(({ node }) => (
          <div
            key={node.id}
            className="border rounded-2xl shadow-md bg-white p-4 hover:shadow-xl transition"
          >
            {node.images.edges.length > 0 && (
              <img
                src={node.images.edges[0].node.src}
                alt={node.images.edges[0].node.altText || node.title}
                className="w-full h-56 object-cover rounded-lg mb-3"
              />
            )}
            <h2 className="text-lg font-semibold mb-1">{node.title}</h2>
            <p className="text-gray-600 text-sm line-clamp-2 mb-2">
              {node.description}
            </p>
            <p className="text-green-700 font-bold mb-3">
              {node.variants.edges[0].node.price.amount}{" "}
              {node.variants.edges[0].node.price.currencyCode}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => addToCart(node.variants.edges[0].node.id)}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-800"
              >
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <button
          onClick={checkout}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-800"
        >
          Go to Checkout
        </button>
      </div>
    </div>
  );
}

export default App;
