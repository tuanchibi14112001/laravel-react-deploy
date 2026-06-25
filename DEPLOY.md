# Deploy lên VPS — chung 1 tên miền `tuanta.site`

Kiến trúc:

```
https://tuanta.site/         ->  React build tĩnh   (frontend/dist)
https://tuanta.site/api/...  ->  Laravel API        (backend/public) qua PHP-FPM
```

Chung 1 domain nên **không còn CORS**. Frontend gọi đường dẫn tương đối `/api`.

> Ví dụ dùng Ubuntu 22.04, Nginx, PHP 8.2-FPM, MySQL. Đổi version PHP cho khớp server bạn.

---

## 0. Trỏ tên miền

Tại nhà cung cấp domain, tạo bản ghi A trỏ về IP VPS:

| Type | Name | Value         |
| ---- | ---- | ------------- |
| A    | @    | <IP_VPS>      |
| A    | www  | <IP_VPS>      |

---

## 1. Cài phần mềm trên VPS

```bash
sudo apt update
sudo apt install -y nginx mysql-server \
  php8.2-fpm php8.2-cli php8.2-mysql php8.2-mbstring \
  php8.2-xml php8.2-curl php8.2-zip php8.2-bcmath unzip git curl

# Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Node.js 20 (để build frontend)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
```

---

## 2. Tạo database

```bash
sudo mysql
```

```sql
CREATE DATABASE user_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- KHÔNG nên dùng root không mật khẩu trên server thật. Tạo user riêng:
CREATE USER 'tuanta'@'localhost' IDENTIFIED BY 'mat_khau_manh';
GRANT ALL PRIVILEGES ON user_management.* TO 'tuanta'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 3. Đưa code lên server

```bash
sudo mkdir -p /var/www/tuanta
sudo chown -R $USER:$USER /var/www/tuanta
cd /var/www/tuanta
git clone <repo-cua-ban> .
# Kết quả: /var/www/tuanta/backend và /var/www/tuanta/frontend
```

---

## 4. Cấu hình Backend (Laravel)

```bash
cd /var/www/tuanta/backend
composer install --no-dev --optimize-autoloader
cp .env.example .env   # hoặc tạo .env theo mẫu dưới
php artisan key:generate
```

Sửa `.env` cho production:

```env
APP_NAME=Laravel
APP_ENV=production
APP_DEBUG=false
APP_URL=https://tuanta.site

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=user_management
DB_USERNAME=tuanta
DB_PASSWORD=mat_khau_manh
```

Migrate + tối ưu cache:

```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Phân quyền để PHP-FPM (user `www-data`) ghi được:

```bash
sudo chown -R www-data:www-data /var/www/tuanta/backend/storage \
                                /var/www/tuanta/backend/bootstrap/cache
```

---

## 5. Build Frontend (React)

```bash
cd /var/www/tuanta/frontend
npm ci
npm run build      # đọc .env.production -> VITE_API_URL=/api
```

Kết quả nằm trong `frontend/dist` (Nginx sẽ phục vụ thư mục này).

---

## 6. Cấu hình Nginx

```bash
sudo cp /var/www/tuanta/deploy/nginx/tuanta.site.conf /etc/nginx/sites-available/tuanta.site
sudo ln -s /etc/nginx/sites-available/tuanta.site /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Kiểm tra phiên bản PHP-FPM socket cho khớp file conf:
ls /run/php/        # ví dụ php8.2-fpm.sock

sudo nginx -t       # kiểm tra cú pháp
```

> Lúc này SSL chưa có nên `nginx -t` có thể báo thiếu cert — sang bước 7 trước,
> hoặc tạm comment 2 dòng `ssl_certificate*` + đổi `listen 443 ssl` thành `listen 80`.

---

## 7. Cài SSL (HTTPS miễn phí — Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tuanta.site -d www.tuanta.site
```

Certbot tự điền đường dẫn cert vào file conf và reload Nginx. Sau đó:

```bash
sudo systemctl reload nginx
```

Mở `https://tuanta.site` — giao diện React hiện ra, và nó gọi `https://tuanta.site/api/users`.

---

## 8. Cập nhật khi có code mới (deploy lại)

```bash
cd /var/www/tuanta && git pull

# Backend
cd backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache && php artisan route:cache

# Frontend
cd ../frontend
npm ci && npm run build

sudo systemctl reload nginx
```

---

## Lưu ý quan trọng

- **Không** dùng `root` không mật khẩu cho MySQL trên server thật (xem bước 2).
- `APP_DEBUG=false` ở production để không lộ thông tin lỗi.
- API hiện chưa có xác thực — bất kỳ ai cũng gọi được CRUD. Nên thêm **Laravel Sanctum**
  (đăng nhập + token) trước khi mở ra Internet. Mình có thể làm tiếp nếu bạn muốn.
- Vì chung domain, file `backend/config/cors.php` không còn cần thiết (cùng origin).
