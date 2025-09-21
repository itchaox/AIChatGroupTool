// AI工具分组管理器 - 侧边栏脚本

class AIGroupManager {
    constructor() {
        this.currentAITool = 'chatgpt';
        this.groups = [];
        this.currentGroupId = null;
        this.contextMenuTarget = null;
        this.currentToolMenuTarget = null;
        this.toolToDelete = null;
        this.groupExpandedStates = {}; // 存储分组展开状态
        
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
        this.loadGroupStates();
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
            
            // 设置自定义下拉框的显示值
            this.updateCustomSelectValue();
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }
    
    // 更新自定义下拉框的显示值
    updateCustomSelectValue() {
        const selectValue = document.getElementById('selectValue');
        const aiTool = this.aiTools[this.currentAITool];
        
        if (selectValue && aiTool) {
            selectValue.innerHTML = `${aiTool.icon} ${aiTool.name}`;
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
        // 自定义下拉框事件
        this.bindCustomSelectEvents();
        
        // 新建分组按钮
        const addGroupBtn = document.getElementById('addGroupBtn');
        addGroupBtn?.addEventListener('click', () => this.showCreateGroupModal());
        
        // 添加收藏按钮
        const addBookmarkBtn = document.getElementById('addBookmarkBtn');
        addBookmarkBtn?.addEventListener('click', () => this.showAddBookmarkModal());
        
        // 模态框事件
        this.bindModalEvents();
        
        // 右键菜单事件
        this.bindContextMenuEvents();
        
        // 工具选项菜单事件
        this.bindToolMenuEvents();
        
        // 全局点击事件（关闭右键菜单和下拉框）
        document.addEventListener('click', (e) => {
            this.hideContextMenu();
            this.closeCustomSelect(e);
        });
    }
    
    // 自定义下拉框事件绑定
    bindCustomSelectEvents() {
        const selectTrigger = document.getElementById('selectTrigger');
        
        // 点击触发器切换下拉框 - 只绑定一次，不会被updateSelectOptions影响
        selectTrigger?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleCustomSelect();
        });
        
        // 绑定下拉框选项事件
        this.bindDropdownEvents();
    }
    
    // 绑定下拉框选项事件（在updateSelectOptions后重新调用）
    bindDropdownEvents() {
        const selectOptions = document.querySelectorAll('.select-option');
        const addToolOption = document.getElementById('addToolOption');
        
        // 添加新工具选项点击事件
        addToolOption?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeCustomSelect();
            this.showAddToolModal();
        });
        
        // 选项点击事件
        selectOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.dataset.value;
                const icon = option.querySelector('.option-icon')?.textContent;
                const text = option.querySelector('.option-text')?.textContent;
                if (value && icon && text) {
                    this.selectAITool(value, icon, text);
                }
            });
        });
        
        // 工具选项菜单按钮事件
        document.querySelectorAll('.option-menu').forEach(menuBtn => {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const toolKey = menuBtn.dataset.tool;
                this.showToolOptionsMenu(e, toolKey);
            });
        });
    }
    
    // 切换下拉框显示状态
    toggleCustomSelect() {
        const selectTrigger = document.getElementById('selectTrigger');
        const selectDropdown = document.getElementById('selectDropdown');
        
        if (selectDropdown?.classList.contains('show')) {
            this.closeCustomSelect();
        } else {
            this.openCustomSelect();
        }
    }
    
    // 打开下拉框
    openCustomSelect() {
        const selectTrigger = document.getElementById('selectTrigger');
        const selectDropdown = document.getElementById('selectDropdown');
        
        selectTrigger?.classList.add('active');
        selectDropdown?.classList.add('show');
        
        // 更新选中状态
        this.updateSelectedOption();
    }
    
    // 关闭下拉框
    closeCustomSelect(event) {
        const customSelect = document.getElementById('customSelect');
        const selectTrigger = document.getElementById('selectTrigger');
        const selectDropdown = document.getElementById('selectDropdown');
        
        // 如果点击的是下拉框内部，不关闭
        if (event && customSelect?.contains(event.target)) {
            return;
        }
        
        selectTrigger?.classList.remove('active');
        selectDropdown?.classList.remove('show');
    }
    
    // 选择AI工具
    selectAITool(value, icon, text) {
        this.currentAITool = value;
        
        // 如果没有传入icon和text，从aiTools中获取
        if (!icon || !text) {
            const tool = this.aiTools[value];
            if (tool) {
                icon = tool.icon || '🤖';
                text = tool.name || '未命名工具';
            }
        }
        
        // 更新显示值
        const selectValue = document.getElementById('selectValue');
        if (selectValue && icon && text) {
            selectValue.innerHTML = `${icon} ${text}`;
        }
        
        // 关闭下拉框
        this.closeCustomSelect();
        
        // 保存数据并重新渲染
        this.saveData();
        this.render();
    }
    
    showAddToolModal() {
        // 重置弹窗状态为新增模式
        this.resetAddToolModal();
        
        // 显示模态框
        this.showModal('addToolModal');
        
        // 绑定图标选择事件
        this.bindIconSelectorEvents();
        
        // 聚焦到工具名称输入框
        const toolNameInput = document.getElementById('toolNameInput');
        setTimeout(() => toolNameInput?.focus(), 100);
    }
    
    addNewTool() {
        const toolNameInput = document.getElementById('toolNameInput');
        const toolIconInput = document.getElementById('toolIconInput');
        
        const toolName = toolNameInput?.value.trim();
        const toolIcon = toolIconInput?.value.trim() || '🤖';
        
        if (!toolName) {
            alert('请输入工具名称');
            return;
        }
        
        if (this.editingToolKey) {
            // 编辑模式：更新现有工具
            this.aiTools[this.editingToolKey] = {
                ...this.aiTools[this.editingToolKey],
                name: toolName,
                icon: toolIcon
            };
            
            // 如果编辑的是当前选中的工具，更新显示
            if (this.currentAITool === this.editingToolKey) {
                const selectValue = document.getElementById('selectValue');
                if (selectValue) {
                    selectValue.innerHTML = `${toolIcon} ${toolName}`;
                }
            }
            
            this.editingToolKey = null;
        } else {
            // 新增模式：创建新工具
            const toolKey = 'custom_' + Date.now();
            
            this.aiTools[toolKey] = {
                name: toolName,
                icon: toolIcon,
                domains: []
            };
            
            // 自动选择新添加的工具
            this.selectAITool(toolKey, toolIcon, toolName);
        }
        
        // 更新下拉选项
        this.updateSelectOptions();
        
        // 保存设置
        this.saveData();
        
        // 关闭模态框并重置状态
        this.hideModal('addToolModal');
        this.resetAddToolModal();
    }
    
    // 重置图标选择
    resetIconSelection() {
        const iconOptions = document.querySelectorAll('.icon-option');
        iconOptions.forEach(option => {
            option.classList.remove('selected');
        });
        
        // 默认选择第一个图标
        const firstIcon = document.querySelector('.icon-option');
        if (firstIcon) {
            firstIcon.classList.add('selected');
        }
    }
    
    // 更新图标选择状态
    updateIconSelection(selectedIcon) {
        const iconOptions = document.querySelectorAll('.icon-option');
        iconOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.icon === selectedIcon) {
                option.classList.add('selected');
            }
        });
    }
    
    // 重置添加工具弹窗状态
    resetAddToolModal() {
        // 重置编辑模式标识
        this.editingToolKey = null;
        
        // 重置弹窗标题和按钮文本
        const modalTitle = document.querySelector('#addToolModal .modal-title');
        const confirmBtn = document.getElementById('confirmAddTool');
        
        if (modalTitle) {
            modalTitle.textContent = '添加新工具';
        }
        
        if (confirmBtn) {
            confirmBtn.textContent = '添加';
        }
        
        // 清空输入框
        const toolNameInput = document.getElementById('toolNameInput');
        const toolIconInput = document.getElementById('toolIconInput');
        
        if (toolNameInput) {
            toolNameInput.value = '';
        }
        
        if (toolIconInput) {
            toolIconInput.value = '🤖';
        }
        
        // 重置图标选择
        this.resetIconSelection();
    }
    
    // 绑定图标选择器事件
    bindIconSelectorEvents() {
        const iconOptions = document.querySelectorAll('.icon-option');
        const toolIconInput = document.getElementById('toolIconInput');
        
        iconOptions.forEach(option => {
            option.addEventListener('click', () => {
                // 移除所有选中状态
                iconOptions.forEach(opt => opt.classList.remove('selected'));
                
                // 添加选中状态
                option.classList.add('selected');
                
                // 更新隐藏输入框值
                const icon = option.dataset.icon;
                if (toolIconInput && icon) {
                    toolIconInput.value = icon;
                }
            });
        });
    }
    
    showToolOptionsMenu(event, toolKey) {
        const toolOptionsMenu = document.getElementById('toolOptionsMenu');
        if (!toolOptionsMenu) return;
        
        this.currentToolMenuTarget = toolKey;
        
        // 显示菜单
        toolOptionsMenu.style.display = 'block';
        
        // 定位菜单
        const rect = event.target.getBoundingClientRect();
        toolOptionsMenu.style.left = (rect.left - 80) + 'px';
        toolOptionsMenu.style.top = (rect.bottom + 5) + 'px';
    }
    
    hideToolOptionsMenu() {
        const toolOptionsMenu = document.getElementById('toolOptionsMenu');
        if (toolOptionsMenu) {
            toolOptionsMenu.style.display = 'none';
        }
        this.currentToolMenuTarget = null;
    }
    
    showEditToolModal(toolKey) {
        const tool = this.aiTools[toolKey];
        if (!tool) return;
        
        // 检查是否为默认工具
        const defaultTools = ['chatgpt', 'claude', 'gemini', 'deepseek'];
        if (defaultTools.includes(toolKey)) {
            alert('默认工具不能编辑');
            return;
        }
        
        // 设置编辑模式
        this.editingToolKey = toolKey;
        
        // 预填充工具数据
        const toolNameInput = document.getElementById('toolNameInput');
        const toolIconInput = document.getElementById('toolIconInput');
        
        if (toolNameInput) {
            toolNameInput.value = tool.name || '';
        }
        
        if (toolIconInput) {
            toolIconInput.value = tool.icon || '🤖';
        }
        
        // 更新图标选择器状态
        this.updateIconSelection(tool.icon || '🤖');
        
        // 更新弹窗标题和按钮文本
        const modalTitle = document.querySelector('#addToolModal .modal-title');
        const confirmBtn = document.getElementById('confirmAddTool');
        
        if (modalTitle) {
            modalTitle.textContent = '编辑工具';
        }
        
        if (confirmBtn) {
            confirmBtn.textContent = '保存';
        }
        
        // 显示模态框
        this.showModal('addToolModal');
        
        // 聚焦到工具名称输入框
        setTimeout(() => toolNameInput?.focus(), 100);
    }
    
    showDeleteToolConfirm(toolKey) {
        const tool = this.aiTools[toolKey];
        if (!tool) return;
        
        // 检查是否为默认工具
        const defaultTools = ['chatgpt', 'claude', 'gemini', 'deepseek'];
        if (defaultTools.includes(toolKey)) {
            alert('默认工具不能删除');
            return;
        }
        
        this.toolToDelete = toolKey;
        const confirmMessage = document.getElementById('confirmDeleteMessage');
        if (confirmMessage) {
            confirmMessage.textContent = `确定要删除工具 "${tool.name}" 吗？`;
        }
        
        this.showModal('confirmDeleteModal');
    }
    
    updateSelectOptions() {
        const selectDropdown = document.getElementById('selectDropdown');
        if (!selectDropdown) return;
        
        // 清空现有选项（保留添加新工具选项）
        const addToolOption = document.getElementById('addToolOption');
        selectDropdown.innerHTML = '';
        if (addToolOption) {
            selectDropdown.appendChild(addToolOption.cloneNode(true));
        }
        
        // 重新生成工具选项
        Object.entries(this.aiTools).forEach(([key, tool]) => {
            const option = document.createElement('div');
            option.className = 'select-option';
            option.dataset.value = key;
            
            const defaultTools = ['chatgpt', 'claude', 'gemini', 'deepseek'];
            const showMenu = !defaultTools.includes(key);
            
            // 确保工具数据完整性
            const toolIcon = tool.icon || '🤖';
            const toolName = tool.name || '未命名工具';
            
            option.innerHTML = `
                <span class="option-icon">${toolIcon}</span>
                <span class="option-text">${toolName}</span>
                ${showMenu ? `<span class="option-menu" data-tool="${key}">⋯</span>` : ''}
            `;
            
            selectDropdown.appendChild(option);
        });
        
        // 重新绑定下拉框事件
        this.bindDropdownEvents();
        this.bindToolOptionMenuEvents();
    }
    
    // 更新选中选项的样式
    updateSelectedOption() {
        const selectOptions = document.querySelectorAll('.select-option');
        
        selectOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.value === this.currentAITool) {
                option.classList.add('selected');
            }
        });
    }
    
    // 绑定工具选项菜单事件
    bindToolMenuEvents() {
        const editToolItem = document.getElementById('editToolItem');
        const deleteToolItem = document.getElementById('deleteToolItem');
        
        if (editToolItem) {
            // 移除之前的事件监听器，避免重复绑定
            editToolItem.replaceWith(editToolItem.cloneNode(true));
            const newEditToolItem = document.getElementById('editToolItem');
            
            newEditToolItem.addEventListener('click', () => {
                this.hideToolOptionsMenu();
                if (this.currentToolMenuTarget) {
                    this.showEditToolModal(this.currentToolMenuTarget);
                }
            });
        }
        
        if (deleteToolItem) {
            // 移除之前的事件监听器，避免重复绑定
            deleteToolItem.replaceWith(deleteToolItem.cloneNode(true));
            const newDeleteToolItem = document.getElementById('deleteToolItem');
            
            newDeleteToolItem.addEventListener('click', () => {
                this.hideToolOptionsMenu();
                if (this.currentToolMenuTarget) {
                    this.showDeleteToolConfirm(this.currentToolMenuTarget);
                }
            });
        }
    }
    
    bindToolOptionMenuEvents() {
        const optionMenus = document.querySelectorAll('.option-menu');
        const toolOptionsMenu = document.getElementById('toolOptionsMenu');
        
        optionMenus.forEach(menu => {
            menu.addEventListener('click', (e) => {
                e.stopPropagation();
                const toolKey = menu.dataset.tool;
                this.showToolOptionsMenu(e, toolKey);
            });
        });
        
        // 点击外部关闭工具选项菜单
        document.addEventListener('click', (e) => {
            if (toolOptionsMenu && !toolOptionsMenu.contains(e.target)) {
                this.hideToolOptionsMenu();
            }
        });
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
        
        // 添加新工具模态框
        const addToolModal = document.getElementById('addToolModal');
        const closeAddToolModal = document.getElementById('closeAddToolModal');
        const cancelAddTool = document.getElementById('cancelAddTool');
        const confirmAddTool = document.getElementById('confirmAddTool');
        const toolNameInput = document.getElementById('toolNameInput');
        
        closeAddToolModal?.addEventListener('click', () => this.hideModal('addToolModal'));
        cancelAddTool?.addEventListener('click', () => this.hideModal('addToolModal'));
        confirmAddTool?.addEventListener('click', () => this.addNewTool());
        
        toolNameInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addNewTool();
        });
        
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
            if (emptyState) {
                groupsList.appendChild(emptyState);
                emptyState.style.display = 'block';
            }
            return;
        }
        
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        groupsList.innerHTML = currentGroups.map(group => `
            <div class="group-item" data-group-id="${group.id}">
                <div class="group-header" data-group-id="${group.id}">
                    <div class="group-header-left">
                        <span class="group-toggle-arrow">▶</span>
                        <span class="group-name">${this.escapeHtml(group.name)}</span>
                    </div>
                    <span class="group-count">${group.bookmarks.length}</span>
                </div>
                <div class="bookmarks-list" data-group-id="${group.id}">
                    ${group.bookmarks.map(bookmark => `
                        <div class="bookmark-item" data-bookmark-id="${bookmark.id}" data-url="${this.escapeHtml(bookmark.url)}">
                            <span class="bookmark-icon">🔗</span>
                            <span class="bookmark-title" title="${this.escapeHtml(bookmark.title)}">${this.escapeHtml(bookmark.title)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        // 初始化分组展开状态
        this.initGroupStates();
        
        // 绑定分组和收藏项事件
        this.bindGroupEvents();
    }
    
    // 初始化分组展开状态
    initGroupStates() {
        const currentGroups = this.groups.filter(group => group.aiTool === this.currentAITool);
        currentGroups.forEach(group => {
            // 如果没有保存的状态，默认展开
            if (this.groupExpandedStates[group.id] === undefined) {
                this.groupExpandedStates[group.id] = true;
            }
            this.updateGroupDisplay(group.id);
        });
    }
    
    // 切换分组展开状态
    toggleGroupExpanded(groupId) {
        this.groupExpandedStates[groupId] = !this.groupExpandedStates[groupId];
        this.updateGroupDisplay(groupId);
        this.saveGroupStates();
    }
    
    // 更新分组显示状态
    updateGroupDisplay(groupId) {
        const bookmarksList = document.querySelector(`.bookmarks-list[data-group-id="${groupId}"]`);
        const arrow = document.querySelector(`.group-item[data-group-id="${groupId}"] .group-toggle-arrow`);
        
        if (bookmarksList && arrow) {
            const isExpanded = this.groupExpandedStates[groupId];
            
            if (isExpanded) {
                bookmarksList.classList.remove('collapsed');
                arrow.textContent = '▼';
            } else {
                bookmarksList.classList.add('collapsed');
                arrow.textContent = '▶';
            }
        }
    }
    
    // 保存分组展开状态
    saveGroupStates() {
        localStorage.setItem('groupExpandedStates', JSON.stringify(this.groupExpandedStates));
    }
    
    // 加载分组展开状态
    loadGroupStates() {
        const saved = localStorage.getItem('groupExpandedStates');
        if (saved) {
            try {
                this.groupExpandedStates = JSON.parse(saved);
            } catch (error) {
                console.error('加载分组状态失败:', error);
                this.groupExpandedStates = {};
            }
        }
    }
    
    bindGroupEvents() {
        // 分组头部点击事件（展开/折叠）
        document.querySelectorAll('.group-header').forEach(groupHeader => {
            groupHeader.addEventListener('click', (e) => {
                e.preventDefault();
                const groupId = groupHeader.dataset.groupId;
                this.toggleGroupExpanded(groupId);
            });
        });
        
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
        // 如果是删除工具
        if (this.toolToDelete) {
            // 删除工具
            delete this.aiTools[this.toolToDelete];
            
            // 如果删除的是当前选中的工具，切换到默认工具
            if (this.currentAITool === this.toolToDelete) {
                this.currentAITool = 'chatgpt';
                const selectValue = document.getElementById('selectValue');
                if (selectValue) {
                    selectValue.innerHTML = `${this.aiTools.chatgpt.icon} ${this.aiTools.chatgpt.name}`;
                }
            }
            
            // 更新下拉选项
            this.updateSelectOptions();
            
            // 保存设置
            this.saveData();
            
            // 关闭模态框
            this.hideModal('confirmDeleteModal');
            
            this.toolToDelete = null;
            return;
        }
        
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
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new AIGroupManager();
    });
} else {
    new AIGroupManager();
}