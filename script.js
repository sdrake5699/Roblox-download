// Cấu hình GitHub
const githubConfig = {
    USERNAME: "sdrake5699",
    REPO: "Roblox-download",
    TOKEN: "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",
    FILE_PATH: "games.json",
    get API_URL() {
        return `https://api.github.com/repos/${this.USERNAME}/${this.REPO}/contents/${this.FILE_PATH}`;
    }
};

// Biến toàn cục
let currentGames = { "all": [] };
let currentTab = "all";

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', async () => {
    await loadGames();
    renderTabs();
    renderGames();
    setupEventListeners();
});

// ========== HÀM CHÍNH ==========

// Tải dữ liệu từ GitHub
async function loadGames() {
    try {
        const response = await fetch(githubConfig.API_URL, {
            headers: { 'Authorization': `Bearer ${githubConfig.TOKEN}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentGames = JSON.parse(atob(data.content));
        } else {
            currentGames = { "all": [], "phổ biến": [], "mới nhất": [] };
        }
    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
    }
}

// Lưu dữ liệu lên GitHub
async function saveGames() {
    try {
        // Lấy SHA file hiện tại
        const shaResponse = await fetch(githubConfig.API_URL, {
            headers: { 'Authorization': `Bearer ${githubConfig.TOKEN}` }
        });
        const sha = shaResponse.ok ? (await shaResponse.json()).sha : null;

        // Gửi dữ liệu mới
        const response = await fetch(githubConfig.API_URL, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${githubConfig.TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Cập nhật lúc ${new Date().toISOString()}`,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(currentGames)))),
                sha
            })
        });

        return response.ok;
    } catch (error) {
        console.error("Lỗi lưu dữ liệu:", error);
        return false;
    }
}

// Thêm tab mới
async function addTab(tabName) {
    if (!currentGames[tabName]) {
        currentGames[tabName] = [];
        const success = await saveGames();
        if (success) {
            renderTabs();
            return true;
        }
    }
    return false;
}

// Thêm game mới
async function addGame(gameData) {
    if (!currentGames[gameData.tab]) {
        currentGames[gameData.tab] = [];
    }
    
    currentGames[gameData.tab].push(gameData);
    currentGames.all.push(gameData);
    
    const success = await saveGames();
    if (success) {
        renderGames();
        return true;
    }
    return false;
}

// ========== HÀM HIỂN THỊ ==========

function renderTabs() {
    const tabContainer = document.getElementById('tabContainer');
    tabContainer.innerHTML = '<div class="tab active" data-tab="all">Tất cả</div>';
    
    Object.keys(currentGames).forEach(tab => {
        if (tab !== "all") {
            const tabElement = document.createElement('div');
            tabElement.className = 'tab';
            tabElement.dataset.tab = tab;
            tabElement.textContent = tab;
            tabElement.addEventListener('click', () => {
                currentTab = tab;
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tabElement.classList.add('active');
                renderGames();
            });
            tabContainer.appendChild(tabElement);
        }
    });
}

function renderGames() {
    const container = document.getElementById('gamesContainer');
    const gamesToShow = currentTab === 'all' ? currentGames.all : currentGames[currentTab] || [];
    
    container.innerHTML = gamesToShow.map(game => `
        <div class="game-card">
            <h3>${game.title}</h3>
            <p>${game.description}</p>
            <a href="${game.link}" target="_blank">Tải về</a>
        </div>
    `).join('');
}

// ========== XỬ LÝ SỰ KIỆN ==========

function setupEventListeners() {
    // Modal thêm game
    const gameModal = document.getElementById('gameModal');
    document.getElementById('addGameBtn').addEventListener('click', () => {
        // Điền options vào select tab
        const tabSelect = document.getElementById('gameTab');
        tabSelect.innerHTML = Object.keys(currentGames)
            .filter(tab => tab !== "all")
            .map(tab => `<option value="${tab}">${tab}</option>`)
            .join('');
        
        gameModal.style.display = 'flex';
    });

    document.getElementById('saveGameBtn').addEventListener('click', async () => {
        const gameData = {
            title: document.getElementById('gameTitle').value,
            description: document.getElementById('gameDescription').value,
            link: document.getElementById('gameLink').value,
            tab: document.getElementById('gameTab').value
        };
        
        if (await addGame(gameData)) {
            gameModal.style.display = 'none';
        }
    });

    // Modal thêm tab
    const tabModal = document.getElementById('tabModal');
    document.getElementById('addTabBtn').addEventListener('click', () => {
        tabModal.style.display = 'flex';
    });

    document.getElementById('saveTabBtn').addEventListener('click', async () => {
        const tabName = document.getElementById('tabName').value;
        if (await addTab(tabName)) {
            tabModal.style.display = 'none';
        }
    });

    // Nút đồng bộ
    document.getElementById('syncBtn').addEventListener('click', async () => {
        await loadGames();
        renderTabs();
        renderGames();
    });

    // Đóng modal khi click bên ngoài
    [gameModal, tabModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    });
}