const id = qs('id');
const p = findProduct(id);
const el = document.getElementById('product');

if (!p) {
  el.innerHTML = '<p>Product not found</p>';
} else {
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
          <a href="cart.html" class="btn secondary">View Cart</a>
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

  document.getElementById('reviewForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const review = {
      name: document.getElementById('rname').value,
      text: document.getElementById('rtext').value,
      rating: Number(document.getElementById('rscore').value),
      date: new Date().toISOString()
    };

    saveReview(p.id, review);
    document.getElementById('avg').textContent = averageRating(p.id);
    renderReviews();
    document.getElementById('reviewForm').reset();
  });

  renderReviews();
}
