// Cấu hình GitHub
const githubConfig = {
    USERNAME: "sdrake5699",
    REPO: "Roblox-download",
    TOKEN: "ghp_yourtokenhere",
    FILE_PATH: "games.json",
    get API_URL() {
        return `https://api.github.com/repos/${this.USERNAME}/${this.REPO}/contents/${this.FILE_PATH}`;
    }
};

// Biến toàn cục
let currentGames = {};
let currentTab = "all";
let tabs = ["all"];

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    setupEventListeners();
});

// ========== HÀM CHÍNH ==========

async function initApp() {
    try {
        // Load cấu hình từ localStorage nếu có
        const savedConfig = localStorage.getItem('githubConfig');
        if (savedConfig) {
            Object.assign(githubConfig, JSON.parse(savedConfig));
        }
        
        await loadGames();
        renderTabs();
        renderGames();
    } catch (error) {
        console.error("Lỗi khởi tạo:", error);
        showAlert("error", "Lỗi khởi tạo", error.message);
        // Khởi tạo dữ liệu mẫu nếu có lỗi
        currentGames = { 
            "all": [], 
            "phổ biến": [], 
            "mới nhất": [],
            "hành động": [],
            "phiêu lưu": []
        };
    }
}

// Tải dữ liệu từ GitHub
async function loadGames() {
    try {
        showLoading(true, "syncBtn");
        
        const response = await fetch(githubConfig.API_URL, {
            headers: { 
                'Authorization': `Bearer ${githubConfig.TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentGames = JSON.parse(atob(data.content));
            updateTabsList();
            showAlert("success", "Thành công", "Đã tải dữ liệu từ GitHub");
            return true;
        } else {
            const errorData = await response.json().catch(() => null);
            let errorMessage = `Lỗi khi tải dữ liệu: ${response.status}`;
            if (errorData && errorData.message) {
                errorMessage += ` - ${errorData.message}`;
            }
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        showAlert("error", "Lỗi tải dữ liệu", error.message);
        return false;
    } finally {
        showLoading(false, "syncBtn");
    }
}

// Lưu dữ liệu lên GitHub
async function saveGames() {
    try {
        // Lấy SHA file hiện tại
        let sha = null;
        try {
            const getRes = await fetch(githubConfig.API_URL, {
                headers: { 
                    'Authorization': `Bearer ${githubConfig.TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (getRes.ok) {
                sha = (await getRes.json()).sha;
            }
        } catch (e) {
            console.log("File chưa tồn tại, sẽ tạo mới");
        }
        
        // Chuẩn bị dữ liệu
        const content = btoa(unescape(encodeURIComponent(
            JSON.stringify(currentGames, null, 2)
        )));
        
        // Gửi lên GitHub
        const response = await fetch(githubConfig.API_URL, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${githubConfig.TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Cập nhật lúc ${new Date().toLocaleString()}`,
                content,
                sha
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            let errorMessage = `Lỗi khi lưu dữ liệu: ${response.status}`;
            if (errorData && errorData.message) {
                errorMessage += ` - ${errorData.message}`;
            }
            throw new Error(errorMessage);
        }
        
        return true;
    } catch (error) {
        console.error("Lỗi lưu dữ liệu:", error);
        throw error;
    }
}

// Thêm tab mới
async function addNewTab(tabName) {
    try {
        if (!tabName || typeof tabName !== 'string') {
            throw new Error("Tên tab không hợp lệ");
        }

        if (currentGames[tabName]) {
            throw new Error(`Tab "${tabName}" đã tồn tại`);
        }

        currentGames[tabName] = [];
        updateTabsList();
        
        const success = await saveGames();
        if (success) {
            showAlert("success", "Thành công", `Đã thêm tab "${tabName}"`);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Lỗi khi thêm tab:", error);
        showAlert("error", "Lỗi", error.message);
        return false;
    }
}

// Thêm game mới
async function addNewGame(gameData) {
    try {
        // Validate game data
        if (!gameData.title || !gameData.description || !gameData.link) {
            throw new Error("Vui lòng điền đầy đủ thông tin");
        }

        if (!isValidUrl(gameData.link)) {
            throw new Error("Link không hợp lệ (phải bắt đầu bằng http:// hoặc https://)");
        }

        if (!gameData.tab || gameData.tab === "all") {
            gameData.tab = tabs.length > 1 ? tabs[1] : "default";
        }

        // Thêm ID và timestamp
        gameData.id = Date.now();
        gameData.createdAt = new Date().toISOString();

        // Thêm vào tab cụ thể
        if (!currentGames[gameData.tab]) {
            currentGames[gameData.tab] = [];
        }
        currentGames[gameData.tab].push(gameData);
        
        // Thêm vào tab 'all'
        currentGames.all.push(gameData);
        
        const success = await saveGames();
        if (success) {
            showAlert("success", "Thành công", "Đã thêm game mới");
            return true;
        }
        return false;
    } catch (error) {
        console.error("Lỗi khi thêm game:", error);
        showAlert("error", "Lỗi", error.message);
        return false;
    }
}

// ========== HÀM HIỂN THỊ ==========

function updateTabsList() {
    tabs = ["all", ...Object.keys(currentGames).filter(tab => tab !== "all")];
}

function renderTabs() {
    const tabContainer = document.getElementById('tabContainer');
    if (!tabContainer) return;
    
    // Giữ lại tab "Tất cả"
    tabContainer.innerHTML = '<div class="tab active" data-tab="all">Tất cả</div>';
    
    // Thêm các tab khác
    tabs.filter(tab => tab !== "all").forEach(tab => {
        const tabElement = document.createElement('div');
        tabElement.className = 'tab';
        tabElement.dataset.tab = tab;
        tabElement.textContent = tab;
        tabElement.addEventListener('click', () => switchTab(tab));
        tabContainer.appendChild(tabElement);
    });
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    renderGames();
}

function renderGames() {
    const container = document.getElementById('gamesContainer');
    const emptyState = document.getElementById('emptyState');
    if (!container || !emptyState) return;
    
    container.innerHTML = '';
    
    const gamesToShow = currentTab === 'all' 
        ? currentGames.all 
        : (currentGames[currentTab] || []);
    
    if (gamesToShow.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    gamesToShow.forEach(game => {
        const gameCard = document.createElement('div');
        gameCard.className = 'game-card';
        gameCard.innerHTML = `
            <h3>${game.title}</h3>
            <p>${game.description}</p>
            <p><a href="${game.link}" target="_blank"><i class="fas fa-external-link-alt"></i> Tải về</a></p>
            <small style="color: rgba(255,255,255,0.5);">${new Date(game.createdAt).toLocaleDateString()}</small>
        `;
        container.appendChild(gameCard);
    });
}

// ========== HÀM HỖ TRỢ ==========

function showLoading(show, elementId) {
    const btn = document.getElementById(elementId);
    if (!btn) return;
    
    if (show) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${btn.textContent}`;
    } else {
        btn.disabled = false;
        // Khôi phục nội dung gốc của nút
        if (elementId === 'saveGameBtn') {
            btn.innerHTML = `<i class="fas fa-save"></i> Lưu Game`;
        } else if (elementId === 'saveTabBtn') {
            btn.innerHTML = `<i class="fas fa-plus-circle"></i> Tạo Tab`;
        } else if (elementId === 'syncBtn') {
            btn.innerHTML = `<i class="fas fa-sync-alt"></i>`;
        }
    }
}

function showAlert(type, title, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.padding = '15px 20px';
    alertDiv.style.borderRadius = '8px';
    alertDiv.style.background = type === 'success' 
        ? 'linear-gradient(45deg, #4cc9f0, #4895ef)' 
        : 'linear-gradient(45deg, #f72585, #ef476f)';
    alertDiv.style.color = 'white';
    alertDiv.style.zIndex = '2000';
    alertDiv.style.display = 'flex';
    alertDiv.style.alignItems = 'center';
    alertDiv.style.gap = '10px';
    alertDiv.style.maxWidth = '400px';
    alertDiv.style.animation = 'fadeIn 0.3s ease';
    
    alertDiv.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <div>
            <h4 style="margin-bottom: 5px; font-weight: 600;">${title}</h4>
            <p style="font-size: 0.9rem; opacity: 0.9;">${message}</p>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Tự động ẩn sau 5 giây
    setTimeout(() => {
        alertDiv.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(alertDiv);
        }, 300);
    }, 5000);
}

function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// ========== XỬ LÝ SỰ KIỆN ==========

function setupEventListeners() {
    // Modal thêm game
    const gameModal = document.getElementById('gameModal');
    const tabSelect = document.getElementById('gameTab');
    
    document.getElementById('addGameBtn').addEventListener('click', () => {
        // Cập nhật danh sách tab
        tabSelect.innerHTML = tabs
            .filter(tab => tab !== "all")
            .map(tab => `<option value="${tab}">${tab}</option>`)
            .join('');
        
        gameModal.style.display = 'flex';
    });

    document.getElementById('cancelGameBtn').addEventListener('click', () => {
        gameModal.style.display = 'none';
        // Reset form
        document.getElementById('gameTitle').value = '';
        document.getElementById('gameDescription').value = '';
        document.getElementById('gameLink').value = '';
    });

    document.getElementById('saveGameBtn').addEventListener('click', async () => {
        const gameData = {
            title: document.getElementById('gameTitle').value.trim(),
            description: document.getElementById('gameDescription').value.trim(),
            link: document.getElementById('gameLink').value.trim(),
            tab: document.getElementById('gameTab').value
        };
        
        showLoading(true, "saveGameBtn");
        const success = await addNewGame(gameData);
        showLoading(false, "saveGameBtn");
        
        if (success) {
            gameModal.style.display = 'none';
            renderGames();
            // Reset form
            document.getElementById('gameTitle').value = '';
            document.getElementById('gameDescription').value = '';
            document.getElementById('gameLink').value = '';
        }
    });

    // Modal thêm tab
    const tabModal = document.getElementById('tabModal');
    
    document.getElementById('addTabBtn').addEventListener('click', () => {
        tabModal.style.display = 'flex';
    });

    document.getElementById('cancelTabBtn').addEventListener('click', () => {
        tabModal.style.display = 'none';
        document.getElementById('tabName').value = '';
    });

    document.getElementById('saveTabBtn').addEventListener('click', async () => {
        const tabName = document.getElementById('tabName').value.trim();
        
        if (!tabName) {
            showAlert("error", "Lỗi", "Vui lòng nhập tên tab");
            return;
        }
        
        showLoading(true, "saveTabBtn");
        const success = await addNewTab(tabName);
        showLoading(false, "saveTabBtn");
        
        if (success) {
            tabModal.style.display = 'none';
            document.getElementById('tabName').value = '';
            renderTabs();
        }
    });

    // Nút đồng bộ
    document.getElementById('syncBtn').addEventListener('click', async () => {
        showLoading(true, "syncBtn");
        await loadGames();
        showLoading(false, "syncBtn");
        renderTabs();
        renderGames();
    });

    // Đóng modal khi click bên ngoài
    [gameModal, tabModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Đóng modal bằng phím ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            gameModal.style.display = 'none';
            tabModal.style.display = 'none';
        }
    });
}
