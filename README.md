# Đồ án Hệ phân tán - CS420C

Đề tài: Tìm hiểu Node.js và xây dựng hệ thống bình chọn trực tuyến phân tán
Giảng viên hướng dẫn: Thầy Nguyễn Minh Nhật
Lớp: CS420C - Nhóm 14
Thành viên thực hiện:
1. Phạm Trường Phi Long
2. Trương Văn Thuận
3. Thái Đoàn Thanh Hải

## 1. Giới thiệu hệ thống

Đây là ứng dụng bình chọn trực tuyến thời gian thực được xây dựng trên nền tảng Node.js. 

Hệ thống sử dụng cơ chế Non-blocking I/O và Event Loop để tiếp nhận nhiều kết nối đồng thời với lượng RAM thấp, kết hợp thuật toán Round-Robin để cân bằng tải 1:1 giữa 2 bản sao xử lý (NODE-1 và NODE-2).

Ngoài ra hệ thống có cơ chế tự động chuyển giao chịu lỗi (Failover) khi một node gặp sự cố và lưu trữ phiếu bầu bền vững xuống tệp JSON trên ổ đĩa.

## 2. Cơ chế hoạt động của hệ thống

Hệ thống vận hành theo quy trình phân tán khép kín gồm 5 bước:

1. Tiếp nhận yêu cầu bất đồng bộ:
Khi người dùng bấm nút bình chọn trên trình duyệt, yêu cầu HTTP POST được gửi tới máy chủ Node.js tại cổng 3000. Nhờ cơ chế Event Loop và Non-blocking I/O của Node.js, máy chủ tiếp nhận yêu cầu ngay trên luồng chính mà không bị chặn, phục vụ được lượng lớn kết nối đồng thời với lượng RAM tối thiểu.

2. Điều phối cân bằng tải luân phiên (Round-Robin):
Bộ điều phối duy trì biến đếm roundRobinCounter. Mỗi khi có lượt bình chọn mới, biến đếm tăng thêm 1 và lấy phần dư khi chia cho 2 (% 2):
- Nếu kết quả là 1 (lượt lẻ): Yêu cầu được chuyển cho NODE-1 xử lý.
- Nếu kết quả là 0 (lượt chẵn): Yêu cầu được chuyển cho NODE-2 xử lý.
Cơ chế này chia đều tải chính xác theo tỷ lệ 50% - 50%, ngăn ngừa tình trạng một máy chủ bị quá tải.

3. Cơ chế tự động chịu lỗi (Failover):
Hệ thống liên tục theo dõi trạng thái hoạt động của các bản sao qua biến cờ isNode1Online:
- Ở trạng thái bình thường: Cả hai node cùng chia tải luân phiên 1:1.
- Khi NODE-1 gặp sự cố (bị ngắt): Hàm điều phối tự động cô lập NODE-1 và chuyển tiếp 100% yêu cầu bình chọn sang NODE-2 xử lý. Nhờ vậy, người dùng không bao giờ gặp lỗi mất kết nối hay mã lỗi 500, đảm bảo tính sẵn sàng cao (High Availability).
- Khi NODE-1 được khắc phục: Hệ thống tự động đưa NODE-1 trở lại chu trình luân phiên mà không cần khởi động lại máy chủ.

4. Cập nhật dữ liệu nguyên tử và lưu trữ bền vững:
Mỗi lượt bình chọn được cập nhật trực tiếp vào trạng thái bộ nhớ (Atomic Update) để tránh tranh chấp dữ liệu (Race Condition). Ngay sau đó, hàm saveStateToDisk() sử dụng module fs của Node.js ghi đồng bộ toàn bộ số liệu xuống tệp votes.json trên ổ đĩa, đảm bảo khi tắt mở lại máy chủ thì số liệu vẫn được khôi phục nguyên vẹn.

5. Phản hồi và cập nhật giao diện thời gian thực:
Máy chủ trả về kết quả JSON gồm tên ứng viên, node vừa xử lý và tổng số phiếu. Giao diện web sử dụng Fetch API nhận dữ liệu và tự động vẽ lại thanh tiến trình phần trăm, cập nhật dòng chữ "Bản sao vừa xử lý" và thêm một dòng ghi chú vào bảng lịch sử trình duyệt.

## 3. Các tệp tin trong thư mục Demo

Thư mục Demo chứa toàn bộ mã nguồn để chạy ứng dụng:
- server.js: Mã nguồn máy chủ Node.js Express, thực hiện thuật toán cân bằng tải Round-Robin, cơ chế tự động chuyển giao khi sập node và đọc ghi dữ liệu xuống đĩa.
- public/index.html: Giao diện web hiển thị trực quan, cho phép người dùng chọn ứng viên để bình chọn, xem bản sao vừa xử lý, có nút thử nghiệm ngắt node và nút đổi giao diện Sáng / Tối.
- check.ps1: Kịch bản PowerShell kiểm thử tự động 20 lượt bình chọn để kiểm tra chia đều tải 50/50 và kiểm thử chuyển giao khi NODE-1 tắt.
- votes.json: Tệp dữ liệu lưu trữ số phiếu của các ứng viên và số lượt xử lý của từng node trên đĩa cứng.
- package.json: Tệp khai báo thông tin dự án và thư viện phụ thuộc Express.

## 4. Hướng dẫn chạy ứng dụng

### Khởi động máy chủ
- Cách 1: Nhấp đúp chuột vào tệp start-demo.bat ở thư mục gốc.
- Cách 2: Mở cửa sổ dòng lệnh tại thư mục Demo rồi gõ lệnh:
```powershell
npm start
```
Trang web sẽ hoạt động tại địa chỉ: http://localhost:3000

### Chạy kiểm thử tự động
Mở một cửa sổ PowerShell tại thư mục Demo và chạy lệnh:
```powershell
.\check.ps1
```
Kịch bản sẽ tự động gửi 20 yêu cầu và in bảng kết quả chia đều 10:10 (tỷ lệ 50% - 50%) giữa NODE-1 và NODE-2.

---

## 5. Trả lời chi tiết cho 5 yêu cầu Phần 2 (Demo minh họa - 4.0 điểm)

### Mục 1: Giới thiệu bài toán và ứng dụng
- Bài toán thực tế: Hệ thống bình chọn trực tuyến thường phải đối mặt với lượng truy cập tăng đột biến trong thời gian rất ngắn (flash crowd). Nếu chỉ dùng 1 máy chủ đơn lẻ sẽ rất dễ bị nghẽn I/O hoặc sập toàn bộ hệ thống.
- Giải pháp với Node.js:
  - Tận dụng kiến trúc đơn luồng hướng sự kiện (Single-threaded Event Loop) và xử lý bất đồng bộ Non-blocking I/O của Node.js để tiếp nhận hàng nghìn yêu cầu đồng thời với chi phí RAM rất thấp.
  - Xây dựng 2 bản sao xử lý (NODE-1 và NODE-2) để phân phối lưu lượng, triệt tiêu nghẽn cổ chai và đảm bảo hệ thống luôn sẵn sàng phục vụ.

### Mục 2: Yêu cầu & Đầu vào / Đầu ra (Input / Output)
- Yêu cầu hệ thống:
  - Tiếp nhận lượt bình chọn cho 3 công nghệ: Node.js, Golang, Python.
  - Cân bằng tải luân phiên 1:1 giữa 2 node xử lý.
  - Có cơ chế chịu lỗi (Failover): khi NODE-1 bị ngắt, 100% yêu cầu tiếp theo phải được chuyển sang NODE-2 xử lý mà không làm gián đoạn người dùng.
  - Lưu trữ dữ liệu bền vững không bị mất khi tắt máy chủ.
- Đầu vào (Input):
  - Yêu cầu HTTP POST gửi tới đường dẫn /api/vote với nội dung JSON:
    { "candidateId": "nodejs" } hoặc "golang", "python".
- Đầu ra (Output):
  - Phản hồi HTTP JSON trả về:
    { "success": true, "processedBy": "NODE-1", "candidateName": "Node.js", "totalVotes": 1 }
  - Giao diện web cập nhật thời gian thực: số phiếu tăng lên, thanh phần trăm co giãn tự động, hiển thị rõ "Bản sao vừa xử lý: NODE-1" và thêm một dòng nhật ký vào bảng lịch sử.

### Mục 3: Các bước triển khai
- Bước 1: Chuẩn bị môi trường Node.js LTS trên máy tính, khởi tạo dự án bằng npm init.
- Bước 2: Cài đặt thư viện web Express bằng lệnh npm install express.
- Bước 3: Xây dựng server.js gồm hàm dispatchNode() cài đặt thuật toán Round-Robin và logic chuyển sang NODE-2 khi NODE-1 gặp sự cố, hàm saveStateToDisk() lưu dữ liệu vào votes.json.
- Bước 4: Xây dựng giao diện public/index.html sử dụng HTML, CSS và Fetch API để kết nối đến máy chủ, tích hợp nút chuyển đổi chế độ Sáng / Tối (Dark/Light mode).
- Bước 5: Viết kịch bản kiểm thử tự động check.ps1 trên PowerShell để gửi 20 yêu cầu liên tiếp và đo đạc tỷ lệ tải.

### Mục 4: Kết quả kiểm thử thực tế
- Phép thử 1 (Khởi động & Giao diện): Máy chủ khởi động thành công trên cổng 3000 trong 1 giây, giao diện hiển thị đầy đủ ở cả 2 chế độ Nền sáng và Nền tối.
- Phép thử 2 (Cân bằng tải): Chạy kịch bản check.ps1 gửi 20 lượt bình chọn liên tiếp. Kết quả: NODE-1 xử lý đúng 10 phiếu (50%), NODE-2 xử lý đúng 10 phiếu (50%). Hệ thống đạt chuẩn chia đều 1:1 PASS 100%.
- Phép thử 3 (Chịu lỗi Failover): Bấm nút mô phỏng tắt NODE-1 sang trạng thái OFFLINE. Gửi thêm các lượt bình chọn tiếp theo, hệ thống tự động chuyển 100% lượt bình chọn sang NODE-2 xử lý thành công, người dùng không gặp bất kỳ lỗi nào.
- Phép thử 4 (Tính bền vững): Tắt máy chủ rồi mở lại, dữ liệu tổng số phiếu được đọc lại nguyên vẹn từ tệp votes.json.

### Mục 5: Kết luận và đánh giá
- Đánh giá kết quả: Ứng dụng hoạt động ổn định, tốc độ phản hồi nhanh dưới 5 mili-giây nhờ Non-blocking I/O, chứng minh đầy đủ 3 đặc trưng cốt lõi của Hệ phân tán gồm Tính đồng thời (Concurrency), Cân bằng tải (Load Balancing) và Khả năng chịu lỗi (Fault Tolerance).
- Hướng phát triển: Có thể mở rộng bằng module cluster của Node.js để chạy đa tiến trình trên tất cả các nhân CPU của máy chủ, hoặc kết hợp Redis để chia sẻ bộ đệm cache phân tán trên nhiều máy tính vật lý.
