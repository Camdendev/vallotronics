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
            # Simple payment record
            payment_method = request.form.get('payment_method', 'Card')
            cur.execute("INSERT INTO payments (order_id, payment_method, amount) VALUES (%s,%s,%s)", (order_id, payment_method, total))
            # shipping info
            address = request.form.get('address', '')
            city = request.form.get('city', '')
            state = request.form.get('state', '')
            postal = request.form.get('postal_code', '')
            country = request.form.get('country', '')
            cur.execute(
                "INSERT INTO shipping_info (order_id, address, city, state, postal_code, country) VALUES (%s,%s,%s,%s,%s,%s)",
                (order_id, address, city, state, postal, country),
            )
            # clear cart
            cur.execute("DELETE FROM cart_items WHERE cart_id = %s", (cart_id,))
            conn.commit()
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
        "SELECT items.item_id, items.item_name, items.description, items.price, items.stock_quantity, categories.category_name FROM items LEFT JOIN categories ON items.category_id = categories.category_id ORDER BY item_id"
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    items = []
    for r in rows:
        items.append(
            {
                'id': r['item_id'],
                'name': r['item_name'],
                'desc': r['description'],
                'price': float(r['price']),
                'stock_quantity': r['stock_quantity'],
                'category': r['category_name'],
                'image': '',
            }
        )
    return json_ok(items)


@app.route('/api/products/<int:item_id>')
def api_product(item_id):
    conn, cur = get_db_cursor()
    cur.execute("SELECT items.item_id, items.item_name, items.description, items.price, items.stock_quantity, categories.category_name FROM items LEFT JOIN categories ON items.category_id = categories.category_id WHERE item_id = %s", (item_id,))
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
        'image': ''
    }
    return json_ok(item)


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


if __name__ == '__main__':
    app.run(debug=True)
