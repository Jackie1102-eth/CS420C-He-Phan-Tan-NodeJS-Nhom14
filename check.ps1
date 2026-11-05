# Kịch bản kiểm thử tự động hệ thống bình chọn phân tán
# Kiểm tra cân bằng tải 50/50 và cơ chế chuyển giao khi có sự cố (Failover)

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3000"

Write-Host "`n=== 1. KHOI TAO & DAT LAI DU LIEU KIEM THU (RESET) ===" -ForegroundColor Cyan
try {
    $resetRes = Invoke-RestMethod -Uri "$baseUrl/api/reset" -Method Post -TimeoutSec 3
    Write-Host " [OK] He thong san sang tai $baseUrl" -ForegroundColor Green
} catch {
    Write-Host " [FAIL] Khong the ket noi toi may chu tai $baseUrl" -ForegroundColor Red
    throw "Vui long chay 'npm start' hoac 'node server.js' tai D:\CS420 truoc khi kiem thu."
}

Write-Host "`n=== 2. KIEM THU BAN 20 PHIEU BINH CHON DONG THOI ===" -ForegroundColor Cyan
Write-Host "Phan bo phieu: 10 phieu Node.js, 5 phieu Golang, 5 phieu Python`n" -ForegroundColor Gray

$voteTargets = @(
    "nodejs", "nodejs", "nodejs", "nodejs", "nodejs",
    "nodejs", "nodejs", "nodejs", "nodejs", "nodejs",
    "golang", "golang", "golang", "golang", "golang",
    "python", "python", "python", "python", "python"
)

$results = @()
$i = 1

foreach ($target in $voteTargets) {
    $body = @{ candidateId = $target } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/vote" -Method Post -Body $body -ContentType "application/json"
    
    $results += [PSCustomObject]@{
        LuotVote    = $i
        UngVien     = $res.candidateName
        NodeXuLy    = $res.processedBy
        TongPhieu   = $res.totalVotes
        KetQua      = if ($res.success) { "PASS" } else { "FAIL" }
    }
    $i++
}

$results | Format-Table LuotVote, UngVien, NodeXuLy, TongPhieu, KetQua -AutoSize

Write-Host "`n=== 3. KIEM TRA TY LE CAN BANG TAI (LOAD BALANCING) ===" -ForegroundColor Cyan
$stats = Invoke-RestMethod -Uri "$baseUrl/api/stats" -Method Get
Write-Host "Ket qua phan bo xu ly phieu giua 2 Node:" -ForegroundColor Gray
Write-Host "  - NODE-1 xu ly: $($stats.node1.votes) phieu ($($stats.node1.percent)%)" -ForegroundColor Green
Write-Host "  - NODE-2 xu ly: $($stats.node2.votes) phieu ($($stats.node2.percent)%)" -ForegroundColor Green

if ($stats.node1.votes -eq 10 -and $stats.node2.votes -eq 10) {
    Write-Host "CAN BANG TAI: PASS (Chia deu tuyet doi 10 : 10, ty le 50% - 50%)" -ForegroundColor Green
} else {
    Write-Host "CAN BANG TAI: FAIL (Khong phan chia deu 1:1)" -ForegroundColor Red
}

Write-Host "`n=== 4. KIEM THU CHIU LOI KHI NODE-1 BI TAT (FAULT TOLERANCE) ===" -ForegroundColor Cyan
Write-Host "Mo phong su co: Tat NODE-1..." -ForegroundColor Yellow
$toggleOff = Invoke-RestMethod -Uri "$baseUrl/api/toggle-node1" -Method Post
Write-Host "Trang thai hien tai: $($toggleOff.message)" -ForegroundColor Gray

Write-Host "Gui them 2 phieu bau khi NODE-1 dang sap..." -ForegroundColor Yellow
$failoverVotes = @("nodejs", "golang")
$failoverResults = @()

foreach ($target in $failoverVotes) {
    $body = @{ candidateId = $target } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$baseUrl/api/vote" -Method Post -Body $body -ContentType "application/json"
    $failoverResults += [PSCustomObject]@{
        UngVien  = $res.candidateName
        NodeXuLy = $res.processedBy
        KetQua   = if ($res.processedBy -eq "NODE-2") { "PASS (Chuyen sang NODE-2)" } else { "FAIL" }
    }
}

$failoverResults | Format-Table UngVien, NodeXuLy, KetQua -AutoSize

# Bat lai Node-1
$toggleOn = Invoke-RestMethod -Uri "$baseUrl/api/toggle-node1" -Method Post
Write-Host "Khoi phuc he thong: $($toggleOn.message)" -ForegroundColor Green

Write-Host "`n=== TONG KET KIEM THU ===" -ForegroundColor Cyan
Write-Host "HOAN TAT KIEM THU!`n" -ForegroundColor Green
