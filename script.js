// CẤU HÌNH GITHUB
const GITHUB_USERNAME = "sdrake5699"; // Thay bằng username GitHub của bạn
const GITHUB_REPO = "Roblox-download";   // Tên repository
const GITHUB_TOKEN = "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";   // Thay bằng token của bạn
const GITHUB_API = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/games.json`;

// BIẾN TOÀN CỤC
let currentGames = {};

// 1. HÀM KHỞI TẠO
async function init() {
  await loadGames();
  renderGames();
}

// 2. HÀM TẢI DỮ LIỆU TỪ GITHUB
async function loadGames() {
  try {
    const response = await fetch(GITHUB_API, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      currentGames = JSON.parse(atob(data.content));
    } else {
      currentGames = { "all": [], "phổ biến": [], "mới nhất": [] };
    }
  } catch (error) {
    console.error("Lỗi tải dữ liệu:", error);
    currentGames = { "all": [], "phổ biến": [], "mới nhất": [] };
  }
}

// 3. HÀM LƯU DỮ LIỆU LÊN GITHUB
async function saveGames() {
  try {
    // Lấy SHA file hiện tại
    const getRes = await fetch(GITHUB_API, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
    });
    const sha = getRes.ok ? (await getRes.json()).sha : null;

    // Chuẩn bị dữ liệu
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(currentGames, null, 2)));
    
    // Gửi lên GitHub
    const response = await fetch(GITHUB_API, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Cập nhật lúc ${new Date().toLocaleString()}`,
        content,
        sha
      })
    });

    if (!response.ok) throw new Error(await response.text());
    
  } catch (error) {
    console.error("Lỗi lưu dữ liệu:", error);
    throw error;
  }
}

// 4. HÀM THÊM GAME MỚI
async function addGame(gameData) {
  if (!currentGames[gameData.tab]) {
    currentGames[gameData.tab] = [];
  }
  
  // Thêm vào tab cụ thể
  currentGames[gameData.tab].push(gameData);
  
  // Thêm vào tab 'all'
  currentGames.all.push(gameData);
  
  // Đồng bộ lên GitHub
  await saveGames();
  
  // Cập nhật giao diện
  renderGames();
}

// 5. HÀM HIỂN THỊ GAME
function renderGames() {
  const container = document.getElementById('games-container');
  container.innerHTML = '';
  
  currentGames.all.forEach(game => {
    container.innerHTML += `
      <div class="game-card">
        <h3>${game.title}</h3>
        <p>${game.description}</p>
        <a href="${game.link}" target="_blank">Tải về</a>
      </div>
    `;
  });
}

// KHỞI CHẠY
document.addEventListener('DOMContentLoaded', init);