const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'votes.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Danh sách ứng viên bình chọn
const DEFAULT_CANDIDATES = [
  {
    id: 'nodejs',
    name: 'Node.js',
    ticker: 'NODE',
    tag: 'Runtime hướng sự kiện, Non-blocking I/O',
    votes: 0,
    color: '#3b82f6'
  },
  {
    id: 'golang',
    name: 'Golang',
    ticker: 'GOLANG',
    tag: 'Ngôn ngữ biên dịch, xử lý đồng thời cao',
    votes: 0,
    color: '#10b981'
  },
  {
    id: 'python',
    name: 'Python',
    ticker: 'PYTHON',
    tag: 'Hệ sinh thái trí tuệ nhân tạo và dữ liệu',
    votes: 0,
    color: '#8b5cf6'
  }
];

let votingState = {
  candidates: JSON.parse(JSON.stringify(DEFAULT_CANDIDATES)),
  history: [],
  loadBalance: {
    'NODE-1': 0,
    'NODE-2': 0
  }
};

// Đọc và lưu dữ liệu vào file votes.json
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    votingState = JSON.parse(raw);
    console.log('[Lưu trữ] Đã nạp dữ liệu phiếu bầu từ votes.json');
  } catch (err) {
    console.warn('[Lưu trữ] Sử dụng dữ liệu khởi tạo mặc định');
  }
}

function saveStateToDisk() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(votingState, null, 2), 'utf8');
  } catch (err) {
    console.error('[Lưu trữ] Lỗi khi ghi file votes.json:', err.message);
  }
}

// Điều phối cân bằng tải Round-Robin và xử lý chịu lỗi
let isNode1Online = true;
let roundRobinCounter = 0;

function dispatchNode() {
  if (!isNode1Online) {
    return 'NODE-2'; // Chuyển giao toàn bộ cho NODE-2 khi NODE-1 gặp sự cố
  }
  roundRobinCounter++;
  return (roundRobinCounter % 2 === 1) ? 'NODE-1' : 'NODE-2';
}

// Các API của hệ thống

// Lấy danh sách ứng viên và tỷ lệ phiếu
app.get('/api/candidates', (req, res) => {
  const totalVotes = votingState.candidates.reduce((sum, c) => sum + c.votes, 0);
  const candidatesWithPercent = votingState.candidates.map(c => ({
    ...c,
    percentage: totalVotes > 0 ? Math.round((c.votes / totalVotes) * 100) : 0
  }));

  res.status(200).json({
    marketTitle: 'Công Nghệ Backend Nào Tối Ưu Nhất Cho Kiến Trúc Hệ Thống Phân Tán?',
    totalVotes,
    candidates: candidatesWithPercent,
    history: votingState.history.slice(0, 15),
    node1Online: isNode1Online,
    nextNode: isNode1Online ? ((roundRobinCounter % 2 === 0) ? 'NODE-1' : 'NODE-2') : 'NODE-2'
  });
});

// Nhận lượt bình chọn
app.post('/api/vote', (req, res) => {
  const { candidateId, count = 1 } = req.body;
  const candidate = votingState.candidates.find(c => c.id === candidateId);

  if (!candidate) {
    return res.status(400).json({ success: false, error: 'Ứng viên bình chọn không hợp lệ' });
  }

  const assignedNode = dispatchNode();
  const voteAmount = Math.max(1, parseInt(count, 10) || 1);

  candidate.votes += voteAmount;
  votingState.loadBalance[assignedNode] += voteAmount;

  const logEntry = {
    candidateId: candidate.id,
    candidateName: candidate.name,
    amount: voteAmount,
    processedBy: assignedNode,
    timestamp: new Date().toLocaleTimeString('vi-VN')
  };

  votingState.history.unshift(logEntry);
  saveStateToDisk();

  const totalVotes = votingState.candidates.reduce((sum, c) => sum + c.votes, 0);

  res.status(200).json({
    success: true,
    processedBy: assignedNode,
    candidateName: candidate.name,
    amount: voteAmount,
    totalVotes
  });
});

// Lấy thống kê phân bổ phiếu giữa các node
app.get('/api/stats', (req, res) => {
  const n1 = votingState.loadBalance['NODE-1'];
  const n2 = votingState.loadBalance['NODE-2'];
  const total = n1 + n2;

  res.status(200).json({
    totalProcessed: total,
    node1: {
      votes: n1,
      percent: total > 0 ? Math.round((n1 / total) * 100) : 50,
      online: isNode1Online
    },
    node2: {
      votes: n2,
      percent: total > 0 ? Math.round((n2 / total) * 100) : 50,
      online: true
    }
  });
});

// Bật hoặc tắt NODE-1 để thử nghiệm chịu lỗi
app.post('/api/toggle-node1', (req, res) => {
  isNode1Online = !isNode1Online;
  res.status(200).json({
    success: true,
    node1Online: isNode1Online,
    message: isNode1Online ? 'Đã khôi phục NODE-1 hoạt động bình thường' : 'Đã ngắt NODE-1 để thử nghiệm cơ chế chịu lỗi'
  });
});

// Đặt lại toàn bộ dữ liệu về 0
app.post('/api/reset', (req, res) => {
  votingState.candidates = JSON.parse(JSON.stringify(DEFAULT_CANDIDATES));
  votingState.history = [];
  votingState.loadBalance = { 'NODE-1': 0, 'NODE-2': 0 };
  roundRobinCounter = 0;
  saveStateToDisk();
  res.status(200).json({ success: true, message: 'Đã đặt lại dữ liệu bình chọn thành công' });
});

app.listen(PORT, () => {
  console.log(`[Hệ thống] Máy chủ Bình chọn Phân tán Node.js đang chạy tại cổng ${PORT}`);
});
