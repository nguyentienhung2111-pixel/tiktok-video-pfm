// app.js - TikTok Performance Prototype v1.3

let db = {};
let currentPage = 'overall';
let currentUser = null;

// --- Initialization ---

async function init() {
    try {
        const response = await fetch('db.json');
        db = await response.json();
        currentUser = db.users[1]; // Simulate login as Trần Thị Linh (Leader)
        updateUserProfileUI();
        renderPage(currentPage);
        setupEventListeners();
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
    }
}

function updateUserProfileUI() {
    const avatar = currentUser.display_name.split(' ').map(n => n[0]).join('').slice(-2).toUpperCase();
    document.getElementById('sidebar-avatar').textContent = avatar;
    document.getElementById('sidebar-user-name').textContent = currentUser.display_name;
    
    let roleText = 'Nhân viên';
    if (currentUser.role === 'admin') roleText = 'Quản trị viên';
    else if (currentUser.role.includes('leader')) roleText = 'Trưởng nhóm';
    document.getElementById('sidebar-user-role').textContent = roleText;
    
    document.getElementById('page-title').textContent = `Xin chào, ${currentUser.display_name} 👋`;
}

function setupEventListeners() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.currentTarget.getAttribute('data-page');
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentPage = page;
            renderPage(page);
        });
    });
}

// --- Router / Rendering ---

function renderPage(page) {
    const pageContent = document.getElementById('page-content');
    pageContent.innerHTML = '';
    
    switch(page) {
        case 'overall': renderOverallDashboard(pageContent); break;
        case 'content': renderTeamDashboard(pageContent, 'brand'); break;
        case 'booking': renderTeamDashboard(pageContent, 'koc'); break;
        default:
            pageContent.innerHTML = `<div style="padding: 5rem; text-align: center; color: var(--text-muted);">Trang "${page}" đang được phát triển...</div>`;
    }
    lucide.createIcons();
}

function renderOverallDashboard(container) {
    const totalGMV = db.videos.reduce((sum, v) => sum + v.gmv, 0);
    const totalViews = db.videos.reduce((sum, v) => sum + v.views, 0);
    
    container.innerHTML = `
        <div class="scorecards-grid">
            <div class="scorecard">
                <div class="scorecard-label">Tổng GMV</div>
                <div class="scorecard-value">${formatCurrency(totalGMV)}</div>
                <div style="font-size: 0.75rem; color: var(--success);">↑ 12.4% so với kỳ trước</div>
            </div>
            <div class="scorecard">
                <div class="scorecard-label">Tổng đơn hàng</div>
                <div class="scorecard-value">${formatNumber(db.videos.reduce((s, v) => s + v.orders, 0))}</div>
                <div style="font-size: 0.75rem; color: var(--success);">↑ 5.1% so với kỳ trước</div>
            </div>
            <div class="scorecard">
                <div class="scorecard-label">Tổng Video</div>
                <div class="scorecard-value">${db.videos.length}</div>
            </div>
            <div class="scorecard">
                <div class="scorecard-label">Tổng lượt xem</div>
                <div class="scorecard-value">${formatNumber(totalViews)}</div>
            </div>
        </div>

        <div style="background: var(--card-bg); padding: 1.5rem; border-radius: 1.25rem; border: 1px solid var(--border-color); margin-bottom: 2rem;">
            <div style="margin-bottom: 1.5rem; font-weight: 600;">Xem chi tiết tất cả video</div>
            ${renderVideoTable(db.videos)}
        </div>
    `;
}

function renderTeamDashboard(container, sourceType) {
    const videos = db.videos.filter(v => v.source_type === sourceType);
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; margin-bottom: 2rem;">
            <div class="scorecard">
                <div class="scorecard-label">GMV ${sourceType === 'brand' ? 'Thương hiệu' : 'KOC'}</div>
                <div class="scorecard-value">${formatCurrency(videos.reduce((s,v) => s + v.gmv, 0))}</div>
            </div>
            <div class="scorecard">
                <div class="scorecard-label">Số lượng Video</div>
                <div class="scorecard-value">${videos.length}</div>
            </div>
            <div class="scorecard">
                <div class="scorecard-label">Tỷ lệ xem hết trung bình</div>
                <div class="scorecard-value">${(videos.reduce((s,v) => s + v.completion_rate, 0) / videos.length).toFixed(1)}%</div>
            </div>
        </div>
        
        <div style="background: var(--card-bg); border-radius: 1.25rem; border: 1px solid var(--border-color);">
            <div class="table-header-box">
                <span style="font-weight: 600;">Danh sách Video ${sourceType === 'brand' ? 'Thương hiệu' : 'KOC / Affiliate'}</span>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" placeholder="Tìm kiếm..." style="background: #0f172a; border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 0.4rem 0.75rem; color: white; font-size: 0.8rem;">
                    <button class="btn btn-primary" style="padding: 0.4rem 0.75rem; font-size: 0.8rem;"><i data-lucide="filter" style="width: 14px;"></i> Lọc</button>
                </div>
            </div>
            ${renderVideoTable(videos)}
        </div>
    `;
}

function renderVideoTable(videos) {
    return `
        <div class="table-scroll-wrapper">
            <table>
                <thead>
                    <tr>
                        <th class="sticky-col-1 sticky-shadow">Video</th>
                        <th class="sticky-col-2 sticky-shadow">Creator</th>
                        <th class="sticky-col-3 sticky-shadow">Nguồn</th>
                        <th>Nhân sự</th>
                        <th>ID Video</th>
                        <th>Ngày đăng</th>
                        <th>Sản phẩm</th>
                        <th>Views</th>
                        <th>Tương tác</th>
                        <th>Follow mới</th>
                        <th>GMV</th>
                        <th>Đơn hàng</th>
                        <th>GPM</th>
                        <th>CTR</th>
                        <th>Xem hết</th>
                        <th>Nhấp→Đặt</th>
                        <th>Chẩn đoán</th>
                        <th>Tags</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    ${videos.map(v => renderVideoRow(v)).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderVideoRow(v) {
    const isLeader = currentUser.role.includes('leader') || currentUser.role === 'admin';
    const sourceLabel = v.source_type === 'brand' ? 'Thương hiệu' : 'KOC';
    const sourceClass = v.source_type === 'brand' ? 'badge-brand' : 'badge-koc';

    return `
        <tr>
            <td class="sticky-col-1 sticky-shadow">
                <div class="truncate" title="${v.title}">${v.title}</div>
            </td>
            <td class="sticky-col-2 sticky-shadow">
                <div class="truncate">${v.creator_name}</div>
            </td>
            <td class="sticky-col-3 sticky-shadow">
                <span class="badge ${sourceClass}">${sourceLabel}</span>
            </td>
            <td>
                ${isLeader ? renderStaffDropdown(v) : (v.assigned_user_id ? getStaffName(v.assigned_user_id) : '<span style="color: var(--danger);">Chưa gắn</span>')}
            </td>
            <td style="color: var(--text-muted); font-family: monospace;">${v.video_id}</td>
            <td>${new Date(v.published_at).toLocaleDateString('vi-VN')}</td>
            <td><div class="truncate">${v.product_name}</div></td>
            <td style="font-weight: 600;">${formatNumber(v.views)}</td>
            <td>${formatNumber(v.engagement)}</td>
            <td>${formatNumber(v.new_followers)}</td>
            <td style="font-weight: 700; color: var(--primary);">${formatCurrency(v.gmv)}</td>
            <td>${v.orders}</td>
            <td>${formatCurrency(v.gpm)}</td>
            <td>${v.ctr}%</td>
            <td>${v.completion_rate}%</td>
            <td>${v.conversion_rate}%</td>
            <td><div class="truncate" title="${v.diagnosis}">${v.diagnosis}</div></td>
            <td>
                <div style="display: flex; gap: 0.25rem;">
                    ${v.tags.map(tid => `<span style="font-size: 0.65rem; padding: 0.1rem 0.3rem; background: #334155; border-radius: 4px;">${db.tags.find(t=>t.id===tid).name}</span>`).join('')}
                </div>
            </td>
            <td>
                <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.7rem;" onclick="openTagModal('${v.id}')">Gắn Tag</button>
            </td>
        </tr>
    `;
}

function renderStaffDropdown(video) {
    // Determine which staff to show based on source type
    const teamType = video.source_type === 'brand' ? 'staff_content' : 'staff_booking';
    const staffMembers = db.users.filter(u => u.role === teamType || u.role === 'admin');
    
    return `
        <select class="staff-select" onchange="assignStaff('${video.id}', this.value)">
            <option value="">-- Chọn NV --</option>
            ${staffMembers.map(m => `
                <option value="${m.id}" ${video.assigned_user_id === m.id ? 'selected' : ''}>${m.display_name}</option>
            `).join('')}
        </select>
    `;
}

// --- Actions ---

window.assignStaff = function(videoId, userId) {
    const video = db.videos.find(v => v.id === videoId);
    if (video) {
        video.assigned_user_id = userId;
        console.log(`Assigned video ${videoId} to user ${userId}`);
        // In a real app, we'd save to DB here.
    }
}

window.openTagModal = function(videoId) {
    const video = db.videos.find(v => v.id === videoId);
    if (!video) return;
    
    selectedVideoId = videoId;
    const grid = document.getElementById('tag-selection-grid');
    grid.innerHTML = '';
    
    db.tags.forEach(tag => {
        const isActive = video.tags.includes(tag.id);
        const btn = document.createElement('button');
        btn.className = `tag-btn ${isActive ? 'active' : ''}`;
        btn.style.cssText = `padding: 0.5rem 1rem; border-radius: 0.75rem; border: 1px solid var(--border-color); background: ${isActive ? 'var(--primary)' : 'transparent'}; color: white; cursor: pointer;`;
        btn.textContent = tag.name;
        btn.onclick = () => {
            if (video.tags.includes(tag.id)) {
                video.tags = video.tags.filter(t => t !== tag.id);
                btn.style.background = 'transparent';
            } else {
                video.tags.push(tag.id);
                btn.style.background = 'var(--primary)';
            }
        };
        grid.appendChild(btn);
    });
    
    document.getElementById('tag-modal').style.display = 'flex';
}

document.getElementById('btn-cancel-tag').onclick = () => document.getElementById('tag-modal').style.display = 'none';
document.getElementById('btn-save-tag').onclick = () => {
    document.getElementById('tag-modal').style.display = 'none';
    renderPage(currentPage);
}

// --- Helpers ---

function getStaffName(id) {
    return db.users.find(u => u.id === id)?.display_name || 'N/A';
}

function formatCurrency(val) {
    if (!val) return '0đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

function formatNumber(val) {
    return new Intl.NumberFormat('vi-VN').format(val || 0);
}

init();
