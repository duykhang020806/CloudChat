# ☁️ CloudChat - Distributed Real-Time Messaging Platform

> **Hệ thống nhắn tin thời gian thực phân tán (Distributed Real-time Chat Architecture)** được thiết kế và triển khai trên nền tảng **AWS Cloud** kết hợp **Cloudflare Edge Workers**.
> 
> 🌐 **Live Production App**: [https://chat.mahira.top](https://chat.mahira.top)  
> 🔗 **Cloudflare Edge Proxy**: `https://cloudchat.pk-duykhang.workers.dev`  
> 🚀 **AWS Application Load Balancer**: `http://alb-cloudchat-1765117084.us-east-1.elb.amazonaws.com`

---

## 📑 Mục Lục
1. [Bối cảnh & Hành trình chuyển đổi kiến trúc](#1-bối-cảnh--hành-trình-chuyển-đổi-kiến-trúc)
2. [Sơ đồ kiến trúc tổng thể hệ thống (Architecture Diagram)](#2-sơ-đồ-kiến-trúc-tổng-thể-hệ-thống-architecture-diagram)
3. [Quy trình cài đặt từng bước trên AWS (2 Backend + 1 Database)](#3-quy-trình-cài-đặt-từng-bước-trên-aws-2-backend--1-database)
4. [Tác dụng của từng thành phần đối với hệ thống](#4-tác-dụng-của-từng-thành-phần-đối-với-hệ-thống)
5. [Tính năng & Chức năng cốt lõi](#5-tính-năng--chức-năng-cốt-lõi)
6. [Cơ chế xử lý khi hệ thống gặp sự cố (Fault Tolerance)](#6-cơ-chế-xử-lý-khi-hệ-thống-gặp-sự-cố-fault-tolerance)
7. [Phương án xử lý sự cố Database (Disaster Recovery & High Availability)](#7-phương-án-xử-lý-sự-cố-database-disaster-recovery--high-availability)
8. [Định hướng nâng cấp trong tương lai (Roadmap)](#8-định-hướng-nâng-cấp-trong-tương-lai-roadmap)

---

## 1. Bối cảnh & Hành trình chuyển đổi kiến trúc

### 🔹 Giai đoạn khởi nguồn (Frontend + Supabase BaaS)
- **Kiến trúc ban đầu**: Ứng dụng chỉ có duy nhất tầng Frontend (React + Vite) kết nối trực tiếp đến nền tảng **Backend-as-a-Service (BaaS) Supabase**. Supabase phụ trách toàn bộ việc xác thực (Auth), lưu trữ dữ liệu PostgreSQL và lắng nghe thay đổi dữ liệu qua kênh Supabase Realtime WebSocket.
- **Hạn chế gặp phải**:
  - **Vendor Lock-in**: Phụ thuộc hoàn toàn vào hạ tầng và chính sách giới hạn tài nguyên của bên thứ ba.
  - **Thiếu kiểm soát Business Logic**: Các logic nghiệp vụ phức tạp (chặn huỷ kết bạn đồng thời, cơ chế tính toán online/offline, heartbeat kháng lệch múi giờ, lọc dữ liệu nhạy cảm) bị hạn chế khi client gọi trực tiếp DB.
  - **Bảo mật**: Mở kết nối trực tiếp từ trình duyệt người dùng đến BaaS tiềm ẩn nguy cơ lộ logic bảng hoặc phụ thuộc vào chính sách Row Level Security (RLS) cồng kềnh.

### 🔹 Giai đoạn chuyển dịch lên AWS (Distributed Custom Micro-Architecture)
- **Mục tiêu**: Xây dựng một kiến trúc chuẩn doanh nghiệp, tự chủ hoàn toàn từ Backend đến Database, có khả năng **cân bằng tải (Load Balancing)**, **sẵn sàng cao (High Availability)**, **tự động phục hồi (Self-Healing)** và **chống chịu lỗi (Fault Tolerance)**.
- **Kết quả**: 
  - Toàn bộ backend được viết lại bằng **Node.js (Express + Socket.io)**.
  - Tự vận hành **PostgreSQL Database Server** riêng biệt trên EC2 với kết nối bảo mật nội bộ VPC.
  - Triển khai **2 máy chủ Backend EC2** chạy song song sau **AWS Application Load Balancer (ALB)** kết hợp **Auto Scaling Group**.
  - Đồng bộ sự kiện thời gian thực xuyên suốt giữa các máy chủ Backend độc lập thông qua cơ chế **PostgreSQL LISTEN / NOTIFY** mà không cần phụ thuộc thêm cụm Redis đắt đỏ.
  - Đặt **Cloudflare Workers** ở rìa (Edge) làm Reverse Proxy hỗ trợ SSL Termination, Custom Domain và bảo vệ chống tấn công DDoS.

---

## 2. Sơ đồ kiến trúc tổng thể hệ thống (Architecture Diagram)

```mermaid
flowchart TD
    subgraph Clients["🌐 Lớp Người Dùng (Client Tier)"]
        UserA["👤 Người dùng A (Browser / Mobile)"]
        UserB["👤 Người dùng B (Browser / Mobile)"]
    end

    subgraph Edge["⚡ Lớp Mạng Rìa (Cloudflare Edge Network)"]
        CF["Cloudflare Worker (Reverse Proxy)\nDomain: chat.mahira.top\n- SSL/TLS Termination\n- Web Traffic Proxy\n- WebSocket Passthrough"]
    end

    subgraph AWSCloud["☁️ AWS Cloud Infrastructure (Region: us-east-1)"]
        subgraph PublicSubnet["🌐 Public Subnet"]
            ALB["AWS Application Load Balancer (ALB)\n- Round-Robin Traffic Distribution\n- Health Check: /health (Interval 15s)\n- Port 80 HTTP / WS Support"]
        end

        subgraph ComputeTier["🖥️ Compute Tier (Auto Scaling Group)"]
            BE1["EC2 Backend 1 (Node.js + Socket.io)\nPrivate IP: 172.31.29.142 | Port: 5000\nPM2 Process Manager"]
            BE2["EC2 Backend 2 (Node.js + Socket.io)\nPrivate IP: 172.31.24.88 | Port: 5000\nPM2 Process Manager"]
        end

        subgraph RealtimeSync["🔄 Cơ chế Đồng Bộ Thời Gian Thực (Pub/Sub)"]
            PG_NOTIFY["PostgreSQL LISTEN / NOTIFY Channel\n(Kênh new_message, user_status, friend_request)"]
        end

        subgraph DataTier["🗄️ Database Tier (Private Isolated EC2)"]
            DB["EC2 Database Server (PostgreSQL 14+)\nPrivate IP: 172.31.x.x | Port: 5432\n- Connection Pooling (20 conns/node)\n- Data Storage: users, messages, friendships, groups"]
        end
    end

    UserA -->|HTTPS / WSS| CF
    UserB -->|HTTPS / WSS| CF
    CF -->|HTTP / WS Forwarding| ALB
    ALB -->|Forward Request| BE1
    ALB -->|Forward Request| BE2

    BE1 -->|SQL Queries & Mutations| DB
    BE2 -->|SQL Queries & Mutations| DB

    BE1 <-->|NOTIFY / LISTEN| PG_NOTIFY
    BE2 <-->|NOTIFY / LISTEN| PG_NOTIFY
    PG_NOTIFY <--> DB
```

---

## 3. Quy trình cài đặt từng bước trên AWS (2 Backend + 1 Database)

### 🔹 Bước 1: Thiết lập Mạng & Security Groups (Nhóm bảo mật)
1. **Tạo Security Group cho Database (`sg-database`)**:
   - **Inbound Rule**: Chỉ mở cổng `5432` (PostgreSQL) cho dải mạng nội bộ VPC `172.31.0.0/16` hoặc trỏ trực tiếp đến `sg-backend`. Tuyệt đối **không** mở cổng 5432 ra `0.0.0.0/0`.
   - **Port 22 (SSH)**: Chỉ cho phép IP của quản trị viên.
2. **Tạo Security Group cho Backend (`sg-backend`)**:
   - **Inbound Rule**: Mở cổng `5000` (Node.js Express) cho Security Group của ALB (`sg-alb`).
   - **Port 22 (SSH)**: Mở cho IP quản trị viên.
3. **Tạo Security Group cho Load Balancer (`sg-alb`)**:
   - **Inbound Rule**: Mở cổng `80` (HTTP) và `443` (HTTPS) cho toàn Internet `0.0.0.0/0` (hoặc dải IP của Cloudflare).

---

### 🔹 Bước 2: Cài đặt và cấu hình EC2 Database Server (1 Instance - PostgreSQL)
1. **Khởi tạo máy ảo EC2**:
   - Loại instance: `t2.micro` hoặc `t3.small` (Ubuntu 22.04 LTS).
   - Đặt Name Tag: `Database-Server CloudChat`.
2. **Cài đặt PostgreSQL**:
   ```bash
   sudo apt update && sudo apt install -y postgresql postgresql-contrib
   ```
3. **Cấu hình lắng nghe kết nối từ mạng nội bộ**:
   - Sửa file `/etc/postgresql/14/main/postgresql.conf`:
     ```ini
     listen_addresses = '*'
     ```
   - Sửa file `/etc/postgresql/14/main/pg_hba.conf` để cấp quyền cho dải mạng VPC:
     ```ini
     # Cho phép các máy ảo Backend trong cùng VPC kết nối bảo mật bằng mật khẩu
     host    all             all             172.31.0.0/16           scram-sha-256
     ```
4. **Khởi tạo User & CSDL**:
   ```bash
   sudo -u postgres psql
   CREATE DATABASE cloudchat_db;
   CREATE USER cloudchat_admin WITH ENCRYPTED PASSWORD 'MatKhauSieuBaoMat_2026';
   GRANT ALL PRIVILEGES ON DATABASE cloudchat_db TO cloudchat_admin;
   \c cloudchat_db
   GRANT ALL ON ALL TABLES IN SCHEMA public TO cloudchat_admin;
   GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO cloudchat_admin;
   ```
5. **Khởi động lại dịch vụ PostgreSQL**:
   ```bash
   sudo systemctl restart postgresql
   sudo systemctl enable postgresql
   ```
6. **Chạy migration Schema**: Tạo các bảng `users`, `friendships`, `groups`, `group_members`, `messages` cùng các index tối ưu:
   ```sql
   CREATE INDEX idx_messages_direct ON messages (sender_id, receiver_id, created_at DESC);
   CREATE INDEX idx_messages_group ON messages (group_id, created_at DESC);
   CREATE INDEX idx_friendships_users ON friendships (user_id, friend_id, status);
   ```

---

### 🔹 Bước 3: Cài đặt và cấu hình 2 Máy chủ EC2 Backend (Backend 1 & Backend 2)
*(Thực hiện tương tự trên cả 2 máy: `CloudChat Backend 1` và `CloudChat Backend 2`)*

1. **Khởi tạo máy ảo EC2**:
   - Loại instance: `t3.small` (Ubuntu 22.04 LTS).
   - Gán Security Group `sg-backend`.
2. **Cài đặt môi trường Node.js & Công cụ**:
   ```bash
   sudo apt update && sudo apt install -y curl git
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   sudo npm install -g pm2
   ```
3. **Clone mã nguồn và cài đặt dependencies**:
   ```bash
   cd ~
   git clone https://github.com/duykhang020806/CloudChat.git
   cd ~/CloudChat/backend
   npm install --production
   ```
4. **Cấu hình biến môi trường (`.env`)**:
   ```env
   PORT=5000
   NODE_ENV=production
   DATABASE_URL=postgres://cloudchat_admin:MatKhauSieuBaoMat_2026@172.31.x.x:5432/cloudchat_db
   JWT_SECRET=cloudchat_super_secure_jwt_token_secret_key_2026
   CORS_ORIGIN=*
   ```
   *(Thay `172.31.x.x` bằng IP nội bộ Private IPv4 của máy chủ Database)*.
5. **Khởi chạy ứng dụng qua PM2 và đăng ký tự khởi động cùng OS**:
   ```bash
   pm2 start src/server.js --name cloudchat-backend
   pm2 save
   sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
   ```
6. **Kiểm tra trạng thái máy chủ tại chỗ**:
   ```bash
   curl http://localhost:5000/health
   # Kết quả trả về: {"status":"UP","hostname":"ip-172-31-...","database":"CONNECTED"}
   ```

---

### 🔹 Bước 4: Cấu hình AWS Application Load Balancer (ALB)
1. **Tạo Target Group (`tg-cloudchat-backends`)**:
   - Target type: `Instances`.
   - Protocol: `HTTP` | Port: `5000`.
   - VPC: Chọn VPC chứa các EC2.
   - **Health check settings**:
     - Health check protocol: `HTTP`.
     - Health check path: `/health`.
     - Advanced health check: Interval `15 seconds`, Timeout `5 seconds`, Healthy threshold `2`, Unhealthy threshold `2`.
   - **Register targets**: Chọn cả 2 máy `CloudChat Backend 1` và `CloudChat Backend 2` với port 5000.
2. **Tạo Application Load Balancer (`alb-cloudchat`)**:
   - Scheme: `Internet-facing`.
   - IP address type: `IPv4`.
   - Network mapping: Chọn ít nhất 2 Availability Zones (ví dụ: `us-east-1a`, `us-east-1b`).
   - Security groups: Gán `sg-alb`.
   - Listeners and routing: Listener HTTP Port `80` forward mặc định đến Target Group `tg-cloudchat-backends`.

---

### 🔹 Bước 5: Cấu hình Auto Scaling Group (ASG) & Giới hạn Instance
1. Tạo **Launch Template** từ AMI hoặc Snapshot của Backend instance hiện tại.
2. Tạo **Auto Scaling Group** (`asg-cloudchat-backends`):
   - Gắn Target Group: `tg-cloudchat-backends`.
   - Bật Elastic Load Balancing health checks.
3. **Cấu hình Group Size (Quan trọng - Kiểm soát chi phí & Tài nguyên Lab)**:
   - **Desired capacity**: `2`
   - **Minimum capacity**: `1` hoặc `2`
   - **Maximum capacity**: `2` (Đặt giới hạn cứng để ngăn Auto Scaling sinh ra hàng chục máy ảo ngoài kiểm soát khi CPU tăng đột biến).
4. **Cấu hình Target Tracking Policy**:
   - Metric type: `Average CPU utilization`.
   - Target value: `60%` hoặc `70%`.
   - Instance warmup: `300 seconds`.

---

### 🔹 Bước 6: Tích hợp Cloudflare Edge Workers làm Reverse Proxy
1. **Mục đích**:
   - Cung cấp chứng chỉ SSL/TLS miễn phí với tên miền riêng `chat.mahira.top`.
   - Che giấu DNS gốc của AWS ALB để phòng chống tấn công DDoS.
   - Đảm bảo các gói tin WebSocket Handshake (`Upgrade: websocket`) được chuyển tiếp trực tiếp không bị ngắt quãng.
2. **Logic cốt lõi trong `worker.js`**:
   ```javascript
   export default {
     async fetch(request, env) {
       const url = new URL(request.url)
       const albUrl = `http://alb-cloudchat-1765117084.us-east-1.elb.amazonaws.com${url.pathname}${url.search}`

       const newHeaders = new Headers(request.headers)
       newHeaders.set('Host', 'alb-cloudchat-1765117084.us-east-1.elb.amazonaws.com')
       newHeaders.set('X-Forwarded-Proto', 'https')

       // WebSocket Handshake Passthrough:
       if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
         return fetch(albUrl, {
           method: request.method,
           headers: newHeaders,
         })
       }

       return fetch(albUrl, {
         method: request.method,
         headers: newHeaders,
         body: request.body,
       })
     }
   }
   ```

---

## 4. Tác dụng của từng thành phần đối với hệ thống

| Thành phần | Vai trò kiến trúc | Tác dụng đối với hệ thống CloudChat |
| :--- | :--- | :--- |
| **Cloudflare Workers** | Edge Reverse Proxy & CDN | - Cấp chứng chỉ HTTPS/SSL hợp lệ cho domain tùy chỉnh.<br>- Giảm độ trễ truy cập nhờ mạng lưới máy chủ biên toàn cầu.<br>- Che giấu Public IP/DNS thật của ALB, bảo vệ hạ tầng AWS trước tấn công DDoS. |
| **AWS ALB** | Application Load Balancer (Layer 7) | - Phân phối lưu lượng đồng đều giữa Backend 1 và Backend 2.<br>- Liên tục gửi Health Check tới `/health`. Nếu 1 máy bị treo/sập, tự động cách ly trong 15s để người dùng không gặp lỗi gián đoạn.<br>- Hỗ trợ nâng cấp Zero-Downtime Deployment (cập nhật từng máy một). |
| **2x EC2 Backend Nodes** | Distributed Compute Cluster | - Xử lý API RESTful và duy trì hàng nghìn kết nối WebSocket Socket.io đồng thời.<br>- Đảm bảo High Availability: 1 máy bảo trì hoặc khởi động lại thì hệ thống vẫn hoạt động 100%.<br>- Tách biệt hoàn toàn phần xử lý logic ứng dụng khỏi tầng lưu trữ CSDL. |
| **Postgres LISTEN / NOTIFY** | Distributed Message Bus | - Đồng bộ tin nhắn và trạng thái giữa các Node Backend khác nhau theo thời gian thực.<br>- Thay thế hoàn toàn cụm Redis đắt đỏ, tiết kiệm chi phí mà vẫn đảm bảo độ trễ tin nhắn < 50ms. |
| **EC2 Database Server** | Centralized Relational Storage | - Lưu trữ toàn vẹn dữ liệu người dùng, tin nhắn, danh sách bạn bè chuẩn quan hệ (ACID).<br>- Nằm trong dải mạng riêng tư (Private Subnet), không có cổng công khai ra Internet, bảo mật tuyệt đối. |
| **PM2 Process Manager** | Process & Cluster Supervisor | - Tự động hồi sinh tiến trình Node.js nếu có sự cố crash ngoài ý muốn.<br>- Tự khởi động backend cùng hệ điều hành Ubuntu khi máy ảo reboot. |

---

## 5. Tính năng & Chức năng cốt lõi

### 🔐 1. Xác thực & Tài khoản bảo mật
- Đăng ký & Đăng nhập bằng Email/Mật khẩu với thuật toán băm **BCrypt** chống tấn công vét cạn.
- Đăng nhập 1-chạm bằng **Google OAuth** (Google Identity Services) với cơ chế xác thực token ID nghiêm ngặt.
- Cấp phát **JWT (JSON Web Token)** chuẩn thuật toán `HS256`, thời hạn 30 ngày.
- Quản lý hồ sơ: Đổi mật khẩu an toàn, đổi ảnh đại diện (avatar), Bio, ngày sinh, giới tính.

### 💬 2. Nhắn tin Real-time chuẩn Telegram
- **Trò chuyện 1-1 & Nhóm chat**: Nhận và gửi tin nhắn tức thì độ trễ thấp (< 50ms).
- **Thu hồi tin nhắn (Revoke)**: Thu hồi tin nhắn ở cả 2 phía người gửi và người nhận.
- **Xoá tin nhắn phía tôi (Delete for me)**: Xoá tin nhắn cục bộ không ảnh hưởng người khác.
- **Trả lời (Reply) & Chuyển tiếp (Forward / Share)**: Trích dẫn ngữ cảnh tin nhắn thông minh.
- **Ghi âm tin nhắn thoại (Voice Note)**:
  - Giao diện thanh ghi âm dải sóng động (Waveform animated).
  - Đồng hồ số hiển thị thời gian chính xác dạng `phút:giây,tích tắc` (`0:03,30`).
  - Hỗ trợ nút Tạm dừng (Pause), Tiếp tục (Resume), Hủy bỏ (Trash) và Gửi trực tiếp.
- **Gửi ảnh & Đính kèm tệp**: Hỗ trợ xem trước (Preview) ảnh phóng to, tải xuống an toàn.

### 👥 3. Quan hệ Bạn bè & Cơ chế Chặn thông minh
- **Tìm kiếm người dùng & Gửi lời mời kết bạn**: Trạng thái minh bạch (`Chờ đồng ý`, `Đồng ý`, `Từ chối`).
- **Quy tắc Chặn (Block) an toàn tuyệt đối**:
  - Khi bấm **Chặn**: Hệ thống lập tức **huỷ quan hệ kết bạn vĩnh viễn** trên Database PostgreSQL và đưa vào danh sách chặn cục bộ.
  - Khi bấm **Bỏ chặn**: Hệ thống **không** tự động khôi phục kết bạn. Muốn nhắn tin tiếp, người dùng bắt buộc phải gửi lại lời mời kết bạn và được đối phương chấp nhận mới mở lại ô nhập tin nhắn.
- **Trung tâm quản lý "Đã chặn / Đã ẩn"**: Tích hợp trực tiếp vào thanh điều hướng Settings, phân chia rạch ròi giữa danh sách người dùng bị chặn và danh sách đoạn chat đang ẩn với các nút tác vụ nhanh (*Mở chat*, *Bỏ ẩn*, *Bỏ chặn*).

### 🟢 4. Trạng thái Trực tuyến & Lần cuối hoạt động (Anti-Skew)
- **Client Heartbeat 25s**: Tự động phát nhịp tim giữ kết nối khi mở tab hoặc quay lại cửa sổ.
- **Tự động chuyển Offline sau 70s**: Tránh triệt để lỗi "online vĩnh viễn" khi người dùng mất mạng đột ngột hoặc tắt máy.
- **Chuẩn hoá thời gian UTC**: Hàm chuyển đổi thời gian thông minh tương thích định dạng PostgreSQL, triệt tiêu hoàn toàn lỗi hiển thị sai múi giờ (*"Lần cuối 2 giờ trước"* dù đang chat).

---

## 6. Cơ chế xử lý khi hệ thống gặp sự cố (Fault Tolerance)

### 🔴 Sự cố 1: Một Node Backend bị sập hoặc quá tải
- **Triệu chứng**: `CloudChat Backend 1` bị mất nguồn hoặc tiến trình Node.js bị quá tải 100% CPU.
- **Cơ chế xử lý tự động**:
  1. ALB gửi health check tới `http://backend-1:5000/health`. Sau 2 lần không nhận được phản hồi (trong vòng 30s), ALB gắn cờ máy này là `Unhealthy`.
  2. ALB tự động định tuyến **100% lưu lượng người dùng** sang máy `CloudChat Backend 2`.
  3. Người dùng trên trình duyệt hoàn toàn không bị ngắt quãng phiên đăng nhập.
  4. Auto Scaling Group (nếu bật) sẽ tự động tiêu hủy instance lỗi và khởi tạo instance thay thế.

### 🔴 Sự cố 2: Kết nối WebSocket bị ngắt quãng giữa chừng
- **Triệu chứng**: Mạng người dùng chập chờn hoặc chuyển đổi giữa Wi-Fi và 4G.
- **Cơ chế xử lý tự động**:
  1. Thư viện Socket.io ở Frontend tự động kích hoạt tiến trình Reconnection với backoff tăng dần.
  2. Tự động fallback xuống HTTP Long-Polling qua ALB nếu giao thức WebSocket bị tường lửa chặn.
  3. Backend cấu hình thời gian đệm **Grace Period 15 giây** khi nhận sự kiện `disconnect`: Tránh tình trạng người dùng vừa bấm F5 tải lại trang mà hệ thống đã vội vàng bắn thông báo "Ngoại tuyến" đến toàn bộ bạn bè (anti-status flapping).

### 🔴 Sự cố 3: Đồng bộ tin nhắn khi User A ở Backend 1 gửi cho User B ở Backend 2
- **Thách thức**: Hai người dùng kết nối WebSocket vào 2 máy chủ vật lý khác nhau do ALB phân phối.
- **Giải pháp**:
  ```
  User A -> [EC2 Backend 1] -> Ghi DB -> Thực thi: pg_notify('new_message', data)
                                                  │
                                                  ▼
                                      [PostgreSQL Server]
                                                  │
                                                  ▼ Nhận qua LISTEN
  User B <- [EC2 Backend 2] <----------------─────┘
  ```
  Nhờ cơ chế này, hệ thống hoạt động như một cụm phân tán thống nhất mà không cần duy trì Stateful Session trên Load Balancer.

---

## 7. Phương án xử lý sự cố Database (Disaster Recovery & High Availability)

Database là trái tim của hệ thống lưu trữ. Dưới đây là các kịch bản sự cố và quy trình xử lý chuẩn kỹ thuật:

### ⚠️ Kịch bản 1: Database bị cạn kiệt kết nối (Connection Exhaustion)
- **Nguyên nhân**: Nhiều backend cùng mở quá nhiều kết nối vượt mức `max_connections` (mặc định 100) của PostgreSQL.
- **Cách khắc phục đã cấu hình**:
  - Trong [`backend/src/db.js`](file:///c:/Users/as/Downloads/CloudChat/backend/src/db.js), mỗi instance được giới hạn `max: 20` kết nối trong Connection Pool. Với 2 máy backend, tối đa chỉ sử dụng 40 kết nối.
  - Cấu hình timeout tự động thu hồi kết nối nhàn rỗi: `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`.
  - **Nâng cao**: Khi mở rộng quy mô trên 5 backend, triển khai **PgBouncer** làm Connection Pooler trung gian phía trước PostgreSQL để gom hàng nghìn client requests thành một nhóm kết nối nhỏ ổn định.

### ⚠️ Kịch bản 2: Database bị treo / Khởi động lại (Crash / Reboot)
- **Triệu chứng**: Endpoint `/health` trả về status `503 Service Unavailable` với nội dung `{"database":"DISCONNECTED"}`.
- **Quy trình cứu hộ bằng lệnh**:
  ```bash
  # 1. SSH vào Database Server
  ssh -i your-key.pem ubuntu@<IP-Database-Server>

  # 2. Kiểm tra log lỗi chi tiết của PostgreSQL
  sudo tail -n 50 /var/log/postgresql/postgresql-14-main.log

  # 3. Khởi động lại dịch vụ PostgreSQL
  sudo systemctl restart postgresql

  # 4. Kiểm tra cổng 5432 đã mở lại chưa
  sudo netstat -tlpn | grep 5432
  ```

### ⚠️ Kịch bản 3: Hỏng ổ cứng hoặc mất dữ liệu (Data Loss Disaster)
- **Chiến lược Sao lưu Dự phòng tự động (Automated Backup Plan)**:
  Tạo cronjob hàng ngày trên máy chủ Database để sao lưu và đồng bộ lên **AWS S3 Bucket**:
  ```bash
  # Tạo file kịch bản sao lưu: /home/ubuntu/backup_db.sh
  #!/bin/bash
  BACKUP_DIR="/home/ubuntu/backups"
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  mkdir -p $BACKUP_DIR
  
  # Xuất CSDL ra file nén
  pg_dump -U cloudchat_admin -d cloudchat_db | gzip > $BACKUP_DIR/cloudchat_$TIMESTAMP.sql.gz
  
  # Giữ lại các bản backup trong 7 ngày gần nhất, xóa bản cũ hơn
  find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +7 -delete
  
  # (Khuyên dùng) Đẩy file backup lên AWS S3
  # aws s3 cp $BACKUP_DIR/cloudchat_$TIMESTAMP.sql.gz s3://cloudchat-database-backups/
  ```
  Đặt lịch tự động chạy lúc 02:00 sáng mỗi ngày bằng `crontab -e`:
  ```cron
  0 2 * * * /bin/bash /home/ubuntu/backup_db.sh > /dev/null 2>&1
  ```
- **Quy trình khôi phục CSDL từ bản sao lưu (Restore Guide)**:
  ```bash
  # 1. Giải nén và nạp lại CSDL
  gunzip -c /home/ubuntu/backups/cloudchat_YYYYMMDD.sql.gz | psql -U cloudchat_admin -d cloudchat_db

  # 2. Khởi động lại backend để làm mới bộ nhớ đệm kết nối
  pm2 restart cloudchat-backend
  ```

---

## 8. Định hướng nâng cấp trong tương lai (Roadmap)

1. **Chuyển đổi Database sang AWS RDS Multi-AZ**:
   - Thay thế việc tự quản trị EC2 PostgreSQL bằng **Amazon RDS for PostgreSQL**.
   - Bật tính năng **Multi-AZ Deployment**: Tự động đồng bộ sang một Data Center khác (Standby Replica), tự động chuyển mạch (Failover) trong vòng 60 giây khi trung tâm dữ liệu chính gặp sự cố động đất/mất điện mà không mất mát dữ liệu.
2. **Lưu trữ Tệp & Đa phương tiện lên AWS S3 + Amazon CloudFront CDN**:
   - Chuyển thư mục lưu trữ ảnh và voice note hiện tại (`backend/uploads/`) sang **Amazon S3 Bucket**.
   - Sử dụng **Presigned URLs** để client tải file trực tiếp lên S3, giảm tải hoàn toàn băng thông cho máy chủ Backend.
   - Phát nội dung media qua CDN **Amazon CloudFront** để tối ưu tốc độ tải ảnh/audio trên toàn cầu.
3. **Mở rộng cụm Cache & Pub/Sub với AWS ElastiCache (Redis)**:
   - Khi lượng người dùng hoạt động đồng thời (CCU) vượt quá 50,000, thay thế PostgreSQL NOTIFY bằng cụm **Redis Cluster**.
   - Lưu trữ Blacklist JWT, Rate Limiting (chống spam chat) và danh sách Presence Online trong bộ nhớ RAM siêu tốc.
4. **Mã hoá đầu cuối (End-to-End Encryption - E2EE)**:
   - Áp dụng giao thức Signal Protocol / Olm để mã hoá tin nhắn ngay tại trình duyệt gửi và chỉ giải mã tại trình duyệt nhận. Máy chủ trung gian chỉ đóng vai trò chuyển tiếp dữ liệu đã mã hoá, bảo vệ quyền riêng tư người dùng ở mức cao nhất.

---

## 👨‍💻 Tác giả & Giấy phép
- **Dự án**: CloudChat Distributed System
- **Nhà phát triển**: [duykhang020806](https://github.com/duykhang020806)
- **Mã nguồn**: [GitHub Repository](https://github.com/duykhang020806/CloudChat)
- **Giấy phép**: MIT License
