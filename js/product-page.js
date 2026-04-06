const id = qs('id');
const el = document.getElementById('product');

fetchProduct(id).then((p) => {
  if (!p) {
    el.innerHTML = '<p>Product not found</p>';
    return;
  }
  el.innerHTML = `
    <div class="product-detail">
      <div class="product-media card">
        <img src="${p.image}" alt="${p.name}">
      </div>

      <div class="product-info">
        <h1>${p.name}</h1>

        <div class="price-row">
          <div class="price">$${p.price}</div>
          <div class="tag">${p.category || ''}</div>
        </div>

        
        <p class="muted">${p.desc}</p>

        <div style="margin-top:12px">
          <button id="add" class="btn">Add to Cart</button>
          <div id="wishlistControl"></div>
        </div>

        <div class="specs">
          <h4>Specifications</h4>
          <table class="spec-table">
            ${Object.entries(p.specs || {}).map(([k, v]) => {
              const acronyms = {
                vram: 'VRAM',
                tdp: 'TDP',
                nvme: 'NVMe',
                ssd: 'SSD',
                psu: 'PSU',
                ram: 'RAM',
                cpu: 'CPU',
                gpu: 'GPU',
                m2: 'M.2'
              };

              const lk = String(k).toLowerCase();
              let nice;

              if (acronyms[lk]) nice = acronyms[lk];
              else {
                nice = String(k)
                  .replace(/[_-]/g, ' ')
                  .replace(/([a-z])([A-Z])/g, '$1 $2')
                  .split(' ')
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ');
              }

              return `<tr><td style="width:160px"><strong>${nice}</strong></td><td>${v}</td></tr>`;
            }).join('')}
          </table>
        </div>

        <div class="reviews">
          <h3>Customer Reviews <span class="muted">(Average <span id="avg">${averageRating(p.id)}</span>)</span></h3>
          <div id="reviewList" class="review-list"></div>

          <div class="review-form" style="margin-top:12px">
            <h4>Write a Review</h4>
            <form id="reviewForm">
              <div class="form-row">
                <label for="rname">Your Name</label>
                <input class="form-input" id="rname" placeholder="Name" required>
              </div>

              <div class="form-row">
                <label for="rtext">Review</label>
                <textarea class="form-input" id="rtext" rows="4" placeholder="Share your experience" required></textarea>
              </div>

              <div class="form-row">
                <label for="rscore">Rating</label>
                <select class="form-input" id="rscore">
                  <option value="5">5</option>
                  <option value="4">4</option>
                  <option value="3">3</option>
                  <option value="2">2</option>
                  <option value="1">1</option>
                </select>
              </div>

              <div class="form-row">
                <button class="btn" type="submit">Submit Review</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  function renderReviews() {
    const list = document.getElementById('reviewList');
    list.innerHTML = '';
    const reviews = getReviews(p.id);

    if (!reviews.length) {
      list.innerHTML = '<p class="muted">No Reviews Yet.</p>';
      return;
    }

    reviews.forEach((r) => {
      const d = document.createElement('div');
      d.className = 'review';
      d.innerHTML = `
        <div class="meta">
          <strong>${r.name}</strong> — <span class="muted">${new Date(r.date).toLocaleDateString()} • ${'★'.repeat(r.rating)}${r.rating < 5 ? '☆'.repeat(5 - r.rating) : ''}</span>
        </div>
        <div>${r.text}</div>
      `;

      list.appendChild(d);
    });
  }

  document.getElementById('add').addEventListener('click', () => {
    app.addToCart(p.id);
  });

  // populate wishlist control based on auth
  fetch('/api/me').then(r => r.json()).then((user) => {
    const ctrl = document.getElementById('wishlistControl');
    if (!ctrl) return;
    if (user) {
      ctrl.innerHTML = `<button id="add-wishlist" class="btn secondary">Add to Wishlist</button>`;
      const aw = document.getElementById('add-wishlist');
      if (aw) {
        aw.addEventListener('click', async () => {
          if (window.wishlist && typeof window.wishlist.add === 'function') {
            await window.wishlist.add(p.id);
            aw.textContent = 'Added';
            aw.disabled = true;
          }
        });
      }
    } else {
      ctrl.innerHTML = `<div class="muted" style="margin-top:8px">You must be logged in to wishlist items</div>`;
    }
  }).catch(() => {
    const ctrl = document.getElementById('wishlistControl');
    if (ctrl) ctrl.innerHTML = `<div class="muted" style="margin-top:8px">You must be logged in to wishlist items</div>`;
  });

  document.getElementById('reviewForm').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Submitting reviews requires server support; this feature is disabled.');
  });

  renderReviews();
});
