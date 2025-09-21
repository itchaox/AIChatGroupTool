// AI工具分组管理器 - 侧边栏脚本

class AIGroupManager {
    constructor() {
        this.currentAITool = 'chatgpt';
        this.groups = [];
        this.currentGroupId = null;
        this.contextMenuTarget = null;
        
        // AI工具配置
        this.aiTools = {
            chatgpt: {
                name: 'ChatGPT',
                domains: ['chat.openai.com', 'chatgpt.com'],
                icon: '🤖'
            },
            claude: {
                name: 'Claude AI',
                domains: ['claude.ai'],
                icon: '🧠'
            },
            gemini: {
                name: 'Google Gemini',
                domains: ['gemini.google.com', 'bard.google.com'],
                icon: '💎'
            },
            poe: {
                name: 'Poe',
                domains: ['poe.com'],
                icon: '🔮'
            }
        };
        
        this.init();
    }
    
    async init() {
        await this.loadData();
        this.bindEvents();
        this.render();
        this.detectCurrentAITool();
    }
    
    // 数据管理
    async loadData() {
        try {
            const result = await chrome.storage.local.get(['aiGroups', 'currentAITool']);
            this.groups = result.aiGroups || [];
            this.currentAITool = result.currentAITool || 'chatgpt';
            
            // 设置AI工具选择器
            const aiToolSelect = document.getElementById('aiToolSelect');
            if (aiToolSelect) {
                aiToolSelect.value = this.currentAITool;
            }
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }
    
    async saveData() {
        try {
            await chrome.storage.local.set({
                aiGroups: this.groups,
                currentAITool: this.currentAITool
            });
        } catch (error) {
            console.error('保存数据失败:', error);
        }
    }
    
    // 事件绑定
    bindEvents() {
        // AI工具选择器
        const aiToolSelect = document.getElementById('aiToolSelect');
        aiToolSelect?.addEventListener('change', (e) => {
            this.currentAITool = e.target.value;
            this.saveData();
            this.render();
        });
        
        // 新建分组按钮
        const addGroupBtn = document.getElementById('addGroupBtn');
        addGroupBtn?.addEventListener('click', () => this.showCreateGroupModal());
        
        // 添加收藏按钮
        const addBookmarkBtn = document.getElementById('addBookmarkBtn');
        addBookmarkBtn?.addEventListener('click', () => this.showAddBookmarkModal());
        
        // 设置按钮
        const settingsBtn = document.getElementById('settingsBtn');
        settingsBtn?.addEventListener('click', () => this.showSettings());
        
        // 模态框事件
        this.bindModalEvents();
        
        // 右键菜单事件
        this.bindContextMenuEvents();
        
        // 全局点击事件（关闭右键菜单）
        document.addEventListener('click', () => this.hideContextMenu());
    }
    
    bindModalEvents() {
        // 新建分组模态框
        const createGroupModal = document.getElementById('createGroupModal');
        const closeCreateGroupModal = document.getElementById('closeCreateGroupModal');
        const cancelCreateGroup = document.getElementById('cancelCreateGroup');
        const confirmCreateGroup = document.getElementById('confirmCreateGroup');
        const groupNameInput = document.getElementById('groupNameInput');
        
        closeCreateGroupModal?.addEventListener('click', () => this.hideModal('createGroupModal'));
        cancelCreateGroup?.addEventListener('click', () => this.hideModal('createGroupModal'));
        confirmCreateGroup?.addEventListener('click', () => this.createGroup());
        
        groupNameInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createGroup();
        });
        
        // 编辑分组模态框
        const editGroupModal = document.getElementById('editGroupModal');
        const closeEditGroupModal = document.getElementById('closeEditGroupModal');
        const cancelEditGroup = document.getElementById('cancelEditGroup');
        const confirmEditGroup = document.getElementById('confirmEditGroup');
        const editGroupNameInput = document.getElementById('editGroupNameInput');
        
        closeEditGroupModal?.addEventListener('click', () => this.hideModal('editGroupModal'));
        cancelEditGroup?.addEventListener('click', () => this.hideModal('editGroupModal'));
        confirmEditGroup?.addEventListener('click', () => this.updateGroup());
        
        editGroupNameInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.updateGroup();
        });
        
        // 添加收藏模态框
        const addBookmarkModal = document.getElementById('addBookmarkModal');
        const closeAddBookmarkModal = document.getElementById('closeAddBookmarkModal');
        const cancelAddBookmark = document.getElementById('cancelAddBookmark');
        const confirmAddBookmark = document.getElementById('confirmAddBookmark');
        
        closeAddBookmarkModal?.addEventListener('click', () => this.hideModal('addBookmarkModal'));
        cancelAddBookmark?.addEventListener('click', () => this.hideModal('addBookmarkModal'));
        confirmAddBookmark?.addEventListener('click', () => this.addBookmark());
        
        // 确认删除模态框
        const confirmDeleteModal = document.getElementById('confirmDeleteModal');
        const closeConfirmDeleteModal = document.getElementById('closeConfirmDeleteModal');
        const cancelDelete = document.getElementById('cancelDelete');
        const confirmDelete = document.getElementById('confirmDelete');
        
        closeConfirmDeleteModal?.addEventListener('click', () => this.hideModal('confirmDeleteModal'));
        cancelDelete?.addEventListener('click', () => this.hideModal('confirmDeleteModal'));
        confirmDelete?.addEventListener('click', () => this.executeDelete());
        
        // 点击模态框背景关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }
    
    bindContextMenuEvents() {
        const editItem = document.getElementById('editItem');
        const deleteItem = document.getElementById('deleteItem');
        const openInNewTab = document.getElementById('openInNewTab');
        
        editItem?.addEventListener('click', () => {
            this.hideContextMenu();
            if (this.contextMenuTarget) {
                const { type, id } = this.contextMenuTarget;
                if (type === 'group') {
                    this.showEditGroupModal(id);
                }
            }
        });
        
        deleteItem?.addEventListener('click', () => {
            this.hideContextMenu();
            if (this.contextMenuTarget) {
                const { type, id } = this.contextMenuTarget;
                this.showDeleteConfirmModal(type, id);
            }
        });
        
        openInNewTab?.addEventListener('click', () => {
            this.hideContextMenu();
            if (this.contextMenuTarget) {
                const { type, id } = this.contextMenuTarget;
                if (type === 'bookmark') {
                    this.openBookmark(id, true);
                }
            }
        });
    }
    
    // 渲染界面
    render() {
        this.renderGroups();
        this.updateBookmarkGroupOptions();
    }
    
    renderGroups() {
        const groupsList = document.getElementById('groupsList');
        const emptyState = document.getElementById('emptyState');
        
        if (!groupsList) return;
        
        // 获取当前AI工具的分组
        const currentGroups = this.groups.filter(group => group.aiTool === this.currentAITool);
        
        if (currentGroups.length === 0) {
            groupsList.innerHTML = '';
            groupsList.appendChild(emptyState);
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        groupsList.innerHTML = currentGroups.map(group => `
            <div class="group-item" data-group-id="${group.id}">
                <div class="group-header">
                    <span class="group-name">${this.escapeHtml(group.name)}</span>
                    <span class="group-count">${group.bookmarks.length}</span>
                </div>
                <div class="bookmarks-list">
                    ${group.bookmarks.map(bookmark => `
                        <div class="bookmark-item" data-bookmark-id="${bookmark.id}" data-url="${this.escapeHtml(bookmark.url)}">
                            <span class="bookmark-icon">🔗</span>
                            <span class="bookmark-title" title="${this.escapeHtml(bookmark.title)}">${this.escapeHtml(bookmark.title)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        // 绑定分组和收藏项事件
        this.bindGroupEvents();
    }
    
    bindGroupEvents() {
        // 分组右键菜单
        document.querySelectorAll('.group-item').forEach(groupItem => {
            groupItem.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const groupId = groupItem.dataset.groupId;
                this.showContextMenu(e, 'group', groupId);
            });
        });
        
        // 收藏项点击事件
        document.querySelectorAll('.bookmark-item').forEach(bookmarkItem => {
            bookmarkItem.addEventListener('click', (e) => {
                const bookmarkId = bookmarkItem.dataset.bookmarkId;
                const isNewTab = e.ctrlKey || e.metaKey;
                this.openBookmark(bookmarkId, isNewTab);
            });
            
            // 收藏项右键菜单
            bookmarkItem.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const bookmarkId = bookmarkItem.dataset.bookmarkId;
                this.showContextMenu(e, 'bookmark', bookmarkId);
            });
        });
    }
    
    // 分组管理
    showCreateGroupModal() {
        const modal = document.getElementById('createGroupModal');
        const input = document.getElementById('groupNameInput');
        
        if (modal && input) {
            input.value = '';
            this.showModal('createGroupModal');
            setTimeout(() => input.focus(), 100);
        }
    }
    
    createGroup() {
        const input = document.getElementById('groupNameInput');
        const name = input?.value.trim();
        
        if (!name) {
            this.showToast('请输入分组名称', 'error');
            return;
        }
        
        // 检查重名
        const exists = this.groups.some(group => 
            group.aiTool === this.currentAITool && group.name === name
        );
        
        if (exists) {
            this.showToast('分组名称已存在', 'error');
            return;
        }
        
        const newGroup = {
            id: this.generateId(),
            name: name,
            aiTool: this.currentAITool,
            bookmarks: [],
            createdAt: Date.now()
        };
        
        this.groups.push(newGroup);
        this.saveData();
        this.render();
        this.hideModal('createGroupModal');
        this.showToast('分组创建成功', 'success');
    }
    
    showEditGroupModal(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;
        
        const modal = document.getElementById('editGroupModal');
        const input = document.getElementById('editGroupNameInput');
        
        if (modal && input) {
            input.value = group.name;
            input.dataset.groupId = groupId;
            this.showModal('editGroupModal');
            setTimeout(() => input.focus(), 100);
        }
    }
    
    updateGroup() {
        const input = document.getElementById('editGroupNameInput');
        const groupId = input?.dataset.groupId;
        const name = input?.value.trim();
        
        if (!name || !groupId) {
            this.showToast('请输入分组名称', 'error');
            return;
        }
        
        // 检查重名（排除自己）
        const exists = this.groups.some(group => 
            group.aiTool === this.currentAITool && 
            group.name === name && 
            group.id !== groupId
        );
        
        if (exists) {
            this.showToast('分组名称已存在', 'error');
            return;
        }
        
        const group = this.groups.find(g => g.id === groupId);
        if (group) {
            group.name = name;
            this.saveData();
            this.render();
            this.hideModal('editGroupModal');
            this.showToast('分组更新成功', 'success');
        }
    }
    
    // 收藏管理
    async showAddBookmarkModal() {
        const modal = document.getElementById('addBookmarkModal');
        const titleInput = document.getElementById('bookmarkTitle');
        const urlInput = document.getElementById('bookmarkUrl');
        
        if (modal && titleInput && urlInput) {
            // 尝试获取当前页面信息
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && this.isAIToolUrl(tab.url)) {
                    titleInput.value = tab.title || '';
                    urlInput.value = tab.url || '';
                } else {
                    titleInput.value = '';
                    urlInput.value = '';
                }
            } catch (error) {
                console.error('获取当前页面信息失败:', error);
                titleInput.value = '';
                urlInput.value = '';
            }
            
            this.showModal('addBookmarkModal');
            setTimeout(() => titleInput.focus(), 100);
        }
    }
    
    addBookmark() {
        const titleInput = document.getElementById('bookmarkTitle');
        const urlInput = document.getElementById('bookmarkUrl');
        const groupSelect = document.getElementById('bookmarkGroup');
        
        const title = titleInput?.value.trim();
        const url = urlInput?.value.trim();
        const groupId = groupSelect?.value;
        
        if (!title || !url || !groupId) {
            this.showToast('请填写完整信息', 'error');
            return;
        }
        
        if (!this.isValidUrl(url)) {
            this.showToast('请输入有效的URL', 'error');
            return;
        }
        
        const group = this.groups.find(g => g.id === groupId);
        if (!group) {
            this.showToast('分组不存在', 'error');
            return;
        }
        
        const newBookmark = {
            id: this.generateId(),
            title: title,
            url: url,
            createdAt: Date.now()
        };
        
        group.bookmarks.push(newBookmark);
        this.saveData();
        this.render();
        this.hideModal('addBookmarkModal');
        this.showToast('收藏添加成功', 'success');
    }
    
    openBookmark(bookmarkId, newTab = false) {
        const bookmark = this.findBookmark(bookmarkId);
        if (!bookmark) return;
        
        if (newTab) {
            chrome.tabs.create({ url: bookmark.url });
        } else {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.update(tabs[0].id, { url: bookmark.url });
                }
            });
        }
    }
    
    // 删除功能
    showDeleteConfirmModal(type, id) {
        const modal = document.getElementById('confirmDeleteModal');
        const confirmText = document.getElementById('deleteConfirmText');
        const confirmBtn = document.getElementById('confirmDelete');
        
        if (!modal || !confirmText || !confirmBtn) return;
        
        let itemName = '';
        if (type === 'group') {
            const group = this.groups.find(g => g.id === id);
            itemName = group ? `分组"${group.name}"` : '该分组';
        } else if (type === 'bookmark') {
            const bookmark = this.findBookmark(id);
            itemName = bookmark ? `收藏"${bookmark.title}"` : '该收藏';
        }
        
        confirmText.textContent = `确定要删除${itemName}吗？此操作无法撤销。`;
        confirmBtn.dataset.deleteType = type;
        confirmBtn.dataset.deleteId = id;
        
        this.showModal('confirmDeleteModal');
    }
    
    executeDelete() {
        const confirmBtn = document.getElementById('confirmDelete');
        const type = confirmBtn?.dataset.deleteType;
        const id = confirmBtn?.dataset.deleteId;
        
        if (!type || !id) return;
        
        if (type === 'group') {
            this.deleteGroup(id);
        } else if (type === 'bookmark') {
            this.deleteBookmark(id);
        }
        
        this.hideModal('confirmDeleteModal');
    }
    
    deleteGroup(groupId) {
        const index = this.groups.findIndex(g => g.id === groupId);
        if (index !== -1) {
            this.groups.splice(index, 1);
            this.saveData();
            this.render();
            this.showToast('分组删除成功', 'success');
        }
    }
    
    deleteBookmark(bookmarkId) {
        for (const group of this.groups) {
            const index = group.bookmarks.findIndex(b => b.id === bookmarkId);
            if (index !== -1) {
                group.bookmarks.splice(index, 1);
                this.saveData();
                this.render();
                this.showToast('收藏删除成功', 'success');
                break;
            }
        }
    }
    
    // 右键菜单
    showContextMenu(event, type, id) {
        const contextMenu = document.getElementById('contextMenu');
        if (!contextMenu) return;
        
        this.contextMenuTarget = { type, id };
        
        contextMenu.style.left = `${event.pageX}px`;
        contextMenu.style.top = `${event.pageY}px`;
        contextMenu.classList.add('show');
        
        // 调整位置避免超出视窗
        const rect = contextMenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (rect.right > viewportWidth) {
            contextMenu.style.left = `${event.pageX - rect.width}px`;
        }
        
        if (rect.bottom > viewportHeight) {
            contextMenu.style.top = `${event.pageY - rect.height}px`;
        }
    }
    
    hideContextMenu() {
        const contextMenu = document.getElementById('contextMenu');
        if (contextMenu) {
            contextMenu.classList.remove('show');
            this.contextMenuTarget = null;
        }
    }
    
    // 模态框管理
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
        }
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    // 工具函数
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    isAIToolUrl(url) {
        if (!url) return false;
        
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            
            for (const tool of Object.values(this.aiTools)) {
                if (tool.domains.some(domain => hostname.includes(domain))) {
                    return true;
                }
            }
        } catch (_) {
            return false;
        }
        
        return false;
    }
    
    findBookmark(bookmarkId) {
        for (const group of this.groups) {
            const bookmark = group.bookmarks.find(b => b.id === bookmarkId);
            if (bookmark) return bookmark;
        }
        return null;
    }
    
    updateBookmarkGroupOptions() {
        const select = document.getElementById('bookmarkGroup');
        if (!select) return;
        
        const currentGroups = this.groups.filter(group => group.aiTool === this.currentAITool);
        
        select.innerHTML = '<option value="">请选择分组</option>' + 
            currentGroups.map(group => 
                `<option value="${group.id}">${this.escapeHtml(group.name)}</option>`
            ).join('');
    }
    
    async detectCurrentAITool() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url) {
                const urlObj = new URL(tab.url);
                const hostname = urlObj.hostname.toLowerCase();
                
                for (const [toolKey, tool] of Object.entries(this.aiTools)) {
                    if (tool.domains.some(domain => hostname.includes(domain))) {
                        if (this.currentAITool !== toolKey) {
                            this.currentAITool = toolKey;
                            const aiToolSelect = document.getElementById('aiToolSelect');
                            if (aiToolSelect) {
                                aiToolSelect.value = toolKey;
                            }
                            this.saveData();
                            this.render();
                        }
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('检测当前AI工具失败:', error);
        }
    }
    
    showSettings() {
        // 简单的设置功能，可以扩展
        this.showToast('设置功能开发中...', 'info');
    }
    
    showToast(message, type = 'info') {
        // 创建简单的toast提示
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 6px;
            color: white;
            font-size: 13px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        
        switch (type) {
            case 'success':
                toast.style.background = '#28a745';
                break;
            case 'error':
                toast.style.background = '#dc3545';
                break;
            case 'info':
            default:
                toast.style.background = '#007acc';
                break;
        }
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// 添加toast动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new AIGroupManager();
});

// 如果DOM已经加载完成
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new AIGroupManager();
    });
} else {
    new AIGroupManager();
}