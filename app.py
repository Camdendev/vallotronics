from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg2.extras
import config
import db

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = config.SECRET_KEY


def get_db_cursor():
    conn = db.get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    return conn, cur


def json_error(msg, code=400):
    return jsonify({'error': str(msg)}), code


def json_ok(data=None):
    return jsonify(data), 200


@app.route('/')
def index():
    conn, cur = get_db_cursor()
    cur.execute(
        "SELECT items.*, categories.category_name FROM items LEFT JOIN categories ON items.category_id = categories.category_id ORDER BY item_id"
    )
    items = cur.fetchall()
    cur.close()
    conn.close()
    return render_template('index.html', items=items)


@app.route('/product/<int:item_id>')
def product_detail(item_id):
    conn, cur = get_db_cursor()
    cur.execute(
        "SELECT items.*, categories.category_name FROM items LEFT JOIN categories ON items.category_id = categories.category_id WHERE item_id = %s",
        (item_id,),
    )
    item = cur.fetchone()
    cur.close()
    conn.close()
    if not item:
        return render_template('product.html', item=None), 404
    return render_template('product.html', item=item)


@app.route('/register', methods=['GET'])
def register():
    return render_template('register.html')


@app.route('/login', methods=['GET'])
def login():
    return render_template('login.html')


@app.route('/logout')
def logout():
    session.pop('user_id', None)
    flash('Logged out')
    return redirect(url_for('index'))


def get_or_create_cart(user_id):
    conn, cur = get_db_cursor()
    cur.execute("SELECT * FROM carts WHERE user_id = %s", (user_id,))
    cart = cur.fetchone()
    if cart:
        cur.close()
        conn.close()
        return cart['cart_id']
    cur.execute("INSERT INTO carts (user_id) VALUES (%s) RETURNING cart_id", (user_id,))
    cart_id = cur.fetchone()['cart_id']
    conn.commit()
    cur.close()
    conn.close()
    return cart_id


@app.route('/cart')
def cart():
    if 'user_id' not in session:
        flash('Please login to view cart')
        return redirect(url_for('login'))
    user_id = session['user_id']
    conn, cur = get_db_cursor()
    cur.execute("SELECT cart_id FROM carts WHERE user_id = %s", (user_id,))
    cart = cur.fetchone()
    items = []
    if cart:
        cart_id = cart['cart_id']
        cur.execute(
            "SELECT ci.*, items.item_name, items.price FROM cart_items ci JOIN items ON ci.item_id = items.item_id WHERE ci.cart_id = %s",
            (cart_id,),
        )
        items = cur.fetchall()
    cur.close()
    conn.close()
    return render_template('cart.html', items=items)


@app.route('/checkout', methods=['GET', 'POST'])
def checkout():
    if 'user_id' not in session:
        flash('Please login to checkout')
        return redirect(url_for('login'))
    user_id = session['user_id']
    conn, cur = get_db_cursor()
    cur.execute("SELECT cart_id FROM carts WHERE user_id = %s", (user_id,))
    cart = cur.fetchone()
    if not cart:
        flash('Cart is empty')
        return redirect(url_for('cart'))
    cart_id = cart['cart_id']
    cur.execute("SELECT ci.*, items.price, items.stock_quantity FROM cart_items ci JOIN items ON ci.item_id = items.item_id WHERE ci.cart_id = %s", (cart_id,))
    cart_items = cur.fetchall()
    total = sum([ci['price'] * ci['quantity'] for ci in cart_items])

    if request.method == 'POST':
        # Create order
        try:
            # create order and order_items first
            cur.execute(
                "INSERT INTO orders (user_id, total_amount) VALUES (%s,%s) RETURNING order_id",
                (user_id, total),
            )
            order_id = cur.fetchone()['order_id']
            for ci in cart_items:
                cur.execute(
                    "INSERT INTO order_items (order_id, item_id, quantity, price) VALUES (%s,%s,%s,%s)",
                    (order_id, ci['item_id'], ci['quantity'], ci['price']),
                )
                # reduce stock
                cur.execute("UPDATE items SET stock_quantity = stock_quantity - %s WHERE item_id = %s", (ci['quantity'], ci['item_id']))

            # commit order and items so they persist even if ancillary inserts fail
            conn.commit()

            # attempt to record payment and shipping; log failures but don't rollback the saved order
            try:
                payment_method = request.form.get('payment_method', 'Card')
                cur.execute("INSERT INTO payments (order_id, payment_method, amount) VALUES (%s,%s,%s)", (order_id, payment_method, total))
            except Exception as e:
                print('Warning: payments insert failed:', e)

            # shipping info
            name = request.form.get('fullname', '')
            address = request.form.get('address', '')
            city = request.form.get('city', '')
            state = request.form.get('state', '')
            postal = request.form.get('postal_code', '')
            country = request.form.get('country', '')
            try:
                cur.execute(
                    "INSERT INTO shipping_info (order_id, name, address, city, state, postal_code, country) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                    (order_id, name, address, city, state, postal, country),
                )
            except Exception as e:
                try:
                    cur.execute(
                        "INSERT INTO shipping_info (order_id, address, city, state, postal_code, country) VALUES (%s,%s,%s,%s,%s,%s)",
                        (order_id, address, city, state, postal, country),
                    )
                except Exception as e2:
                    print('Warning: shipping_info insert failed:', e, e2)

            # clear cart
            try:
                cur.execute("DELETE FROM cart_items WHERE cart_id = %s", (cart_id,))
                conn.commit()
            except Exception as e:
                print('Warning: clearing cart failed:', e)

            flash('Order placed')
            return redirect(url_for('order_confirmation', order_id=order_id))
        except Exception as e:
            conn.rollback()
            flash('Checkout failed: ' + str(e))
    cur.close()
    conn.close()
    return render_template('checkout.html', items=cart_items, total=total)


@app.route('/order-confirmation/<int:order_id>')
def order_confirmation(order_id):
    conn, cur = get_db_cursor()
    cur.execute("SELECT * FROM orders WHERE order_id = %s", (order_id,))
    order = cur.fetchone()
    cur.execute(
        "SELECT oi.*, items.item_name FROM order_items oi JOIN items ON oi.item_id = items.item_id WHERE oi.order_id = %s",
        (order_id,),
    )
    items = cur.fetchall()
    cur.execute("SELECT * FROM shipping_info WHERE order_id = %s", (order_id,))
    ship = cur.fetchone()
    cur.close()
    conn.close()
    return render_template('order-confirmation.html', order=order, items=items, ship=ship)


@app.route('/admin')
def admin_dashboard():
    # simple admin view listing orders and users
    conn, cur = get_db_cursor()
    cur.execute("SELECT * FROM orders ORDER BY order_date DESC LIMIT 50")
    orders = cur.fetchall()
    cur.execute("SELECT user_id, username, email, created_at FROM users ORDER BY created_at DESC LIMIT 50")
    users = cur.fetchall()
    cur.close()
    conn.close()
    return render_template('dashboard.html', orders=orders, users=users)


@app.route('/<page>.html')
def render_static_page(page):
    # allowlist of pages we intentionally expose from templates
    allowed = {
        'index', 'products', 'product', 'cart', 'checkout', 'register', 'login',
        'order-confirmation', 'dashboard', 'wishlist'
    }
    if page not in allowed:
        return "Not found", 404
    return render_template(f"{page}.html")


@app.route('/api/products')
def api_products():
    conn, cur = get_db_cursor()
    cur.execute(
        "SELECT items.* , categories.category_name FROM items LEFT JOIN categories ON items.category_id = categories.category_id ORDER BY item_id"
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    items = []
    for r in rows:
        it = {
            'id': r['item_id'],
            'name': r['item_name'],
            'desc': r['description'],
            'price': float(r['price']),
            'stock_quantity': r['stock_quantity'],
            'category': r['category_name'],
            'image': r.get('image_url') or ''
        }
        # include specs if available (JSON column)
        if r.get('specs') is not None:
            it['specs'] = r.get('specs')
        items.append(it)
    return json_ok(items)


@app.route('/api/products/<int:item_id>')
def api_product(item_id):
    conn, cur = get_db_cursor()
    cur.execute("SELECT items.* , categories.category_name FROM items LEFT JOIN categories ON items.category_id = categories.category_id WHERE item_id = %s", (item_id,))
    r = cur.fetchone()
    cur.close()
    conn.close()
    if not r:
        return json_error('not found', 404)
    item = {
        'id': r['item_id'],
        'name': r['item_name'],
        'desc': r['description'],
        'price': float(r['price']),
        'stock_quantity': r['stock_quantity'],
        'category': r['category_name'],
        'image': r.get('image_url') or ''
    }
    if r.get('specs') is not None:
        item['specs'] = r.get('specs')
    return json_ok(item)


@app.route('/api/reviews', methods=['GET'])
def api_get_reviews():
    item_id = request.args.get('item_id')
    if not item_id:
        return json_error('missing item_id', 400)
    try:
        iid = int(item_id)
    except Exception:
        return json_error('invalid item_id', 400)

    conn, cur = get_db_cursor()
    try:
        # include reviewer username when available
        cur.execute("SELECT r.review_id, r.item_id, r.user_id, r.rating, r.text, r.created_at, r.approved, u.username AS reviewer FROM reviews r LEFT JOIN users u ON r.user_id = u.user_id WHERE r.item_id = %s AND r.approved = TRUE ORDER BY r.created_at DESC", (iid,))
        rows = cur.fetchall()
        reviews = []
        for r in rows:
            reviews.append({'review_id': r['review_id'], 'item_id': r['item_id'], 'user_id': r.get('user_id'), 'username': r.get('reviewer'), 'rating': r['rating'], 'text': r.get('text'), 'created_at': r.get('created_at').isoformat() if r.get('created_at') else None})

        # compute average
        cur.execute("SELECT AVG(rating) as avg FROM reviews WHERE item_id = %s AND approved = TRUE", (iid,))
        avg_row = cur.fetchone()
        avg = float(avg_row['avg']) if avg_row and avg_row['avg'] is not None else 0.0
        cur.close()
        conn.close()
        return json_ok({'reviews': reviews, 'avg': round(avg, 2)})
    except Exception as e:
        cur.close()
        conn.close()
        return json_error(str(e), 400)


@app.route('/api/reviews', methods=['POST'])
def api_post_review():
    data = request.get_json() or {}
    item_id = data.get('item_id')
    rating = data.get('rating')
    text = data.get('text')

    if item_id is None or rating is None:
        return json_error('missing fields', 400)
    try:
        iid = int(item_id)
        rating = int(rating)
    except Exception:
        return json_error('invalid fields', 400)
    if rating < 1 or rating > 5:
        return json_error('rating out of range', 400)

    user_id = session.get('user_id') if 'user_id' in session else None

    conn, cur = get_db_cursor()
    try:
        # ensure item exists
        cur.execute("SELECT item_id FROM items WHERE item_id = %s", (iid,))
        if not cur.fetchone():
            cur.close()
            conn.close()
            return json_error('item not found', 404)

        cur.execute("INSERT INTO reviews (item_id, user_id, rating, text, approved) VALUES (%s,%s,%s,%s,%s) RETURNING review_id, created_at",
                    (iid, user_id, rating, text, True))
        r = cur.fetchone()
        conn.commit()
        review_id = r['review_id']
        created_at = r.get('created_at')
        cur.close()
        conn.close()
        return json_ok({'review_id': review_id, 'created_at': created_at.isoformat() if created_at else None})
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        return json_error(str(e), 400)


@app.route('/api/reviews/<int:review_id>', methods=['DELETE'])
def api_delete_review(review_id):
    if 'user_id' not in session:
        return json_error('not authenticated', 401)
    user_id = session['user_id']
    conn, cur = get_db_cursor()
    try:
        cur.execute("SELECT user_id FROM reviews WHERE review_id = %s", (review_id,))
        r = cur.fetchone()
        if not r:
            cur.close()
            conn.close()
            return json_error('not found', 404)

        owner_id = r.get('user_id')
        # allow owner or admin
        cur.execute("SELECT role_id FROM users WHERE user_id = %s", (user_id,))
        u = cur.fetchone()
        role = u.get('role_id') if u else None
        if owner_id != user_id and role != 1:
            cur.close()
            conn.close()
            return json_error('forbidden', 403)

        cur.execute("DELETE FROM reviews WHERE review_id = %s", (review_id,))
        conn.commit()
        cur.close()
        conn.close()
        return json_ok({'deleted': True})
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        return json_error(str(e), 400)


@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json() or {}
    username = data.get('username') or data.get('email')
    email = data.get('email')
    password = data.get('password')
    first = data.get('first_name')
    last = data.get('last_name')
    if not username or not email or not password:
        return json_error('missing fields', 400)
    password_hash = generate_password_hash(password)
    conn, cur = get_db_cursor()
    try:
        cur.execute("INSERT INTO users (role_id, username, email, password_hash, first_name, last_name) VALUES (%s,%s,%s,%s,%s,%s) RETURNING user_id, username, email",
                    (2, username, email, password_hash, first, last))
        u = cur.fetchone()
        conn.commit()
        session['user_id'] = u['user_id']
        return json_ok({'user_id': u['user_id'], 'username': u['username'], 'email': u['email']})
    except Exception as e:
        conn.rollback()
        return json_error(str(e), 400)
    finally:
        cur.close()
        conn.close()


@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    username = data.get('username') or data.get('email')
    password = data.get('password')
    if not username or not password:
        return json_error('missing fields', 400)
    conn, cur = get_db_cursor()
    cur.execute("SELECT * FROM users WHERE username = %s OR email = %s", (username, username))
    user = cur.fetchone()
    cur.close()
    conn.close()
    if user and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['user_id']
        return json_ok({'user_id': user['user_id'], 'username': user['username'], 'email': user['email']})
    return json_error('invalid credentials', 401)


@app.route('/api/me', methods=['GET'])
def api_me():
    if 'user_id' not in session:
        return json_ok(None)
    user_id = session['user_id']
    conn, cur = get_db_cursor()
    cur.execute("SELECT user_id, username, email, first_name, last_name, role_id FROM users WHERE user_id = %s", (user_id,))
    u = cur.fetchone()
    cur.close()
    conn.close()
    if not u:
        return json_ok(None)
    return json_ok({'user_id': u['user_id'], 'username': u['username'], 'email': u['email'], 'first_name': u.get('first_name'), 'last_name': u.get('last_name'), 'role_id': u.get('role_id')})


@app.route('/api/cart', methods=['GET'])
def api_get_cart():
    if 'user_id' not in session:
        return jsonify([])
    user_id = session['user_id']
    conn, cur = get_db_cursor()
    cur.execute("SELECT cart_id FROM carts WHERE user_id = %s", (user_id,))
    cart = cur.fetchone()
    items = []
    if cart:
        cart_id = cart['cart_id']
        cur.execute("SELECT ci.quantity, items.item_id, items.item_name, items.price FROM cart_items ci JOIN items ON ci.item_id = items.item_id WHERE ci.cart_id = %s", (cart_id,))
        rows = cur.fetchall()
        for r in rows:
            items.append({'id': r['item_id'], 'qty': r['quantity'], 'name': r['item_name'], 'price': float(r['price'])})
    cur.close()
    conn.close()
    return json_ok(items)


@app.route('/api/add_to_cart', methods=['POST'])
def api_add_to_cart():
    if 'user_id' not in session:
        return json_error('not authenticated', 401)
    data = request.get_json() or {}
    item_id = data.get('item_id')
    quantity = int(data.get('quantity', 1))
    user_id = session['user_id']
    cart_id = get_or_create_cart(user_id)
    conn, cur = get_db_cursor()
    try:
        cur.execute("SELECT quantity FROM cart_items WHERE cart_id = %s AND item_id = %s", (cart_id, item_id))
        existing = cur.fetchone()
        if existing:
            cur.execute("UPDATE cart_items SET quantity = quantity + %s WHERE cart_id = %s AND item_id = %s", (quantity, cart_id, item_id))
        else:
            cur.execute("INSERT INTO cart_items (cart_id, item_id, quantity) VALUES (%s,%s,%s)", (cart_id, item_id, quantity))
        conn.commit()
        return json_ok({'success': True})
    except Exception as e:
        conn.rollback()
        return json_error(str(e), 400)
    finally:
        cur.close()
        conn.close()


@app.route('/api/remove_from_cart', methods=['POST'])
def api_remove_from_cart():
    if 'user_id' not in session:
        return json_error('not authenticated', 401)
    data = request.get_json() or {}
    item_id = data.get('item_id')
    if not item_id:
        return json_error('missing item_id', 400)
    user_id = session['user_id']
    conn, cur = get_db_cursor()
    try:
        cur.execute("SELECT cart_id FROM carts WHERE user_id = %s", (user_id,))
        cart = cur.fetchone()
        if not cart:
            cur.close()
            conn.close()
            return json_ok({'removed': False})
        cart_id = cart['cart_id']
        cur.execute("DELETE FROM cart_items WHERE cart_id = %s AND item_id = %s", (cart_id, item_id))
        conn.commit()
        cur.close()
        conn.close()
        return json_ok({'removed': True})
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        return json_error(str(e), 400)


@app.route('/api/update_cart', methods=['POST'])
def api_update_cart():
    if 'user_id' not in session:
        return json_error('not authenticated', 401)
    data = request.get_json() or {}
    item_id = data.get('item_id')
    quantity = data.get('quantity')
    if item_id is None or quantity is None:
        return json_error('missing item_id or quantity', 400)
    try:
        quantity = int(quantity)
    except Exception:
        return json_error('invalid quantity', 400)
    user_id = session['user_id']
    conn, cur = get_db_cursor()
    try:
        cur.execute("SELECT cart_id FROM carts WHERE user_id = %s", (user_id,))
        cart = cur.fetchone()
        if not cart:
            # create cart if updating into empty
            cart_id = get_or_create_cart(user_id)
        else:
            cart_id = cart['cart_id']

        if quantity <= 0:
            cur.execute("DELETE FROM cart_items WHERE cart_id = %s AND item_id = %s", (cart_id, item_id))
        else:
            cur.execute("SELECT quantity FROM cart_items WHERE cart_id = %s AND item_id = %s", (cart_id, item_id))
            existing = cur.fetchone()
            if existing:
                cur.execute("UPDATE cart_items SET quantity = %s WHERE cart_id = %s AND item_id = %s", (quantity, cart_id, item_id))
            else:
                cur.execute("INSERT INTO cart_items (cart_id, item_id, quantity) VALUES (%s,%s,%s)", (cart_id, item_id, quantity))

        conn.commit()
        cur.close()
        conn.close()
        return json_ok({'updated': True})
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        return json_error(str(e), 400)


@app.route('/api/wishlist', methods=['GET'])
def api_get_wishlist():
    if 'user_id' not in session:
        return json_ok([])
    user_id = session['user_id']
    conn, cur = get_db_cursor()
    cur.execute("SELECT item_id FROM wishlists WHERE user_id = %s ORDER BY created_at", (user_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return json_ok([r['item_id'] for r in rows])


@app.route('/api/wishlist', methods=['POST'])
def api_add_wishlist():
    if 'user_id' not in session:
        return json_error('not authenticated', 401)
    data = request.get_json() or {}
    item_id = data.get('item_id')
    if not item_id:
        return json_error('missing item_id', 400)
    user_id = session['user_id']
    conn, cur = get_db_cursor()
    try:
        cur.execute("INSERT INTO wishlists (user_id, item_id) VALUES (%s,%s) ON CONFLICT DO NOTHING RETURNING id", (user_id, item_id))
        added = cur.fetchone() is not None
        conn.commit()
        cur.close()
        conn.close()
        return json_ok({'added': added})
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        return json_error(str(e), 400)


@app.route('/api/wishlist', methods=['DELETE'])
def api_remove_wishlist():
    if 'user_id' not in session:
        return json_error('not authenticated', 401)
    data = request.get_json() or {}
    item_id = data.get('item_id')
    if not item_id:
        return json_error('missing item_id', 400)
    user_id = session['user_id']
    conn, cur = get_db_cursor()
    try:
        cur.execute("DELETE FROM wishlists WHERE user_id = %s AND item_id = %s", (user_id, item_id))
        conn.commit()
        cur.close()
        conn.close()
        return json_ok({'removed': True})
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        return json_error(str(e), 400)


@app.route('/api/orders', methods=['GET'])
def api_orders():
    if 'user_id' not in session:
        return json_ok([])
    user_id = session['user_id']
    conn, cur = get_db_cursor()
    cur.execute("SELECT * FROM orders WHERE user_id = %s ORDER BY order_date DESC", (user_id,))
    orders = cur.fetchall()
    out = []
    for o in orders:
        cur.execute("SELECT oi.*, items.item_name, items.price FROM order_items oi JOIN items ON oi.item_id = items.item_id WHERE oi.order_id = %s", (o['order_id'],))
        items = cur.fetchall()
        cur.execute("SELECT * FROM shipping_info WHERE order_id = %s", (o['order_id'],))
        ship = cur.fetchone()
        out.append({
            'id': o['order_id'],
            'total': float(o['total_amount']),
            'items': [{'item_id': it['item_id'], 'quantity': it['quantity'], 'price': float(it['price']), 'name': it.get('item_name')} for it in items],
            'shipping': ship
        })
    cur.close()
    conn.close()
    return json_ok(out)


@app.route('/api/orders/<int:order_id>', methods=['GET'])
def api_order_detail(order_id):
    if 'user_id' not in session:
        return json_error('not authenticated', 401)
    user_id = session['user_id']
    conn, cur = get_db_cursor()
    cur.execute("SELECT * FROM orders WHERE order_id = %s AND user_id = %s", (order_id, user_id))
    o = cur.fetchone()
    if not o:
        cur.close()
        conn.close()
        return json_error('not found', 404)
    cur.execute("SELECT oi.*, items.item_name, items.price FROM order_items oi JOIN items ON oi.item_id = items.item_id WHERE oi.order_id = %s", (order_id,))
    items = cur.fetchall()
    cur.execute("SELECT * FROM shipping_info WHERE order_id = %s", (order_id,))
    ship = cur.fetchone()
    cur.close()
    conn.close()
    return json_ok({'id': o['order_id'], 'total': float(o['total_amount']), 'items': [{'item_id': it['item_id'], 'quantity': it['quantity'], 'price': float(it['price']), 'name': it.get('item_name')} for it in items], 'shipping': ship})


@app.route('/api/users', methods=['GET'])
def api_users():
    # return list of users for admin
    if 'user_id' not in session:
        return json_ok([])
    user_id = session['user_id']
    conn, cur = get_db_cursor()
    try:
        cur.execute("SELECT role_id FROM users WHERE user_id = %s", (user_id,))
        u = cur.fetchone()
        if not u or u.get('role_id') != 1:
            cur.close()
            conn.close()
            return json_ok([])

        cur.execute("SELECT user_id, username, email, first_name, last_name, created_at FROM users ORDER BY created_at DESC LIMIT 500")
        rows = cur.fetchall()
        out = []
        for r in rows:
            out.append({'user_id': r['user_id'], 'username': r.get('username'), 'email': r.get('email'), 'first_name': r.get('first_name'), 'last_name': r.get('last_name'), 'created_at': str(r.get('created_at'))})
        cur.close()
        conn.close()
        return json_ok(out)
    except Exception as e:
        cur.close()
        conn.close()
        return json_error(str(e), 400)


@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def api_delete_user(user_id):
    # admin-only user deletion
    if 'user_id' not in session:
        return json_error('not authenticated', 401)
    admin_id = session['user_id']
    conn, cur = get_db_cursor()
    try:
        cur.execute("SELECT role_id FROM users WHERE user_id = %s", (admin_id,))
        u = cur.fetchone()
        if not u or u.get('role_id') != 1:
            cur.close()
            conn.close()
            return json_error('forbidden', 403)

        cur.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
        conn.commit()
        cur.close()
        conn.close()
        return json_ok({'deleted': True})
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        return json_error(str(e), 400)


@app.route('/api/orders/<int:order_id>', methods=['DELETE'])
def api_delete_order(order_id):
    if 'user_id' not in session:
        return json_error('not authenticated', 401)
    user_id = session['user_id']
    conn, cur = get_db_cursor()
    try:
        cur.execute("SELECT user_id FROM orders WHERE order_id = %s", (order_id,))
        o = cur.fetchone()
        if not o:
            cur.close()
            conn.close()
            return json_error('not found', 404)

        owner_id = o.get('user_id')
        # allow if owner or admin
        cur.execute("SELECT role_id FROM users WHERE user_id = %s", (user_id,))
        u = cur.fetchone()
        role = u.get('role_id') if u else None
        if owner_id != user_id and role != 1:
            cur.close()
            conn.close()
            return json_error('forbidden', 403)

        # delete related rows if they exist
        try:
            cur.execute("DELETE FROM order_items WHERE order_id = %s", (order_id,))
        except Exception:
            pass
        try:
            cur.execute("DELETE FROM payments WHERE order_id = %s", (order_id,))
        except Exception:
            pass
        try:
            cur.execute("DELETE FROM shipping_info WHERE order_id = %s", (order_id,))
        except Exception:
            pass
        cur.execute("DELETE FROM orders WHERE order_id = %s", (order_id,))
        conn.commit()
        cur.close()
        conn.close()
        return json_ok({'deleted': True})
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        return json_error(str(e), 400)


if __name__ == '__main__':
    app.run(debug=True)
