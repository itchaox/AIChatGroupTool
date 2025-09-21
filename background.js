// AI工具分组管理器 - 背景脚本

// 插件安装时的初始化
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('AI工具分组管理器已安装');
    
    if (details.reason === 'install') {
        // 首次安装时的初始化
        await initializeExtension();
    } else if (details.reason === 'update') {
        // 更新时的处理
        console.log('插件已更新到新版本');
        await handleExtensionUpdate();
    }
});

// 初始化扩展
async function initializeExtension() {
    try {
        // 设置默认数据
        const defaultData = {
            aiGroups: [],
            currentAITool: 'chatgpt',
            settings: {
                theme: 'dark',
                autoDetectAITool: true,
                showNotifications: true
            }
        };
        
        // 检查是否已有数据
        const existingData = await chrome.storage.local.get(['aiGroups', 'currentAITool', 'settings']);
        
        // 只设置不存在的数据
        const dataToSet = {};
        if (!existingData.aiGroups) {
            dataToSet.aiGroups = defaultData.aiGroups;
        }
        if (!existingData.currentAITool) {
            dataToSet.currentAITool = defaultData.currentAITool;
        }
        if (!existingData.settings) {
            dataToSet.settings = defaultData.settings;
        }
        
        if (Object.keys(dataToSet).length > 0) {
            await chrome.storage.local.set(dataToSet);
        }
        
        console.log('插件初始化完成');
        
        // 显示欢迎通知
        showWelcomeNotification();
        
    } catch (error) {
        console.error('初始化插件失败:', error);
    }
}

// 处理插件更新
async function handleExtensionUpdate() {
    try {
        // 这里可以处理数据迁移等更新逻辑
        console.log('处理插件更新');
        
        // 检查并修复可能的数据结构问题
        const data = await chrome.storage.local.get(['aiGroups', 'settings']);
        
        let needsUpdate = false;
        const updates = {};
        
        // 确保aiGroups是数组
        if (!Array.isArray(data.aiGroups)) {
            updates.aiGroups = [];
            needsUpdate = true;
        }
        
        // 确保settings对象存在
        if (!data.settings || typeof data.settings !== 'object') {
            updates.settings = {
                theme: 'dark',
                autoDetectAITool: true,
                showNotifications: true
            };
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            await chrome.storage.local.set(updates);
            console.log('数据结构已更新');
        }
        
    } catch (error) {
        console.error('处理更新失败:', error);
    }
}

// 显示欢迎通知
function showWelcomeNotification() {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'AI工具分组管理器',
        message: '插件安装成功！点击工具栏图标开始使用。'
    });
}

// 处理工具栏图标点击
if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(async (tab) => {
    try {
      // 打开侧边栏
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
      console.error('Failed to open side panel:', error);
    }
  });
} else if (chrome.browserAction && chrome.browserAction.onClicked) {
  // Fallback for older Chrome versions
  chrome.browserAction.onClicked.addListener(async (tab) => {
    try {
      // 打开侧边栏
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
      console.error('Failed to open side panel:', error);
    }
  });
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // 只在页面完全加载后处理
    if (changeInfo.status === 'complete' && tab.url) {
        try {
            const settings = await chrome.storage.local.get('settings');
            
            // 如果启用了自动检测AI工具
            if (settings.settings?.autoDetectAITool !== false) {
                const aiTool = detectAIToolFromUrl(tab.url);
                if (aiTool) {
                    // 更新当前AI工具
                    await chrome.storage.local.set({ currentAITool: aiTool });
                    
                    // 向侧边栏发送消息更新UI
                    try {
                        await chrome.runtime.sendMessage({
                            type: 'AI_TOOL_DETECTED',
                            aiTool: aiTool,
                            tabInfo: {
                                id: tab.id,
                                title: tab.title,
                                url: tab.url
                            }
                        });
                    } catch (error) {
                        // 侧边栏可能未打开，忽略错误
                    }
                }
            }
        } catch (error) {
            console.error('处理标签页更新失败:', error);
        }
    }
});

// 监听标签页激活
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url) {
            const settings = await chrome.storage.local.get('settings');
            
            if (settings.settings?.autoDetectAITool !== false) {
                const aiTool = detectAIToolFromUrl(tab.url);
                if (aiTool) {
                    await chrome.storage.local.set({ currentAITool: aiTool });
                    
                    // 向侧边栏发送消息
                    try {
                        await chrome.runtime.sendMessage({
                            type: 'AI_TOOL_DETECTED',
                            aiTool: aiTool,
                            tabInfo: {
                                id: tab.id,
                                title: tab.title,
                                url: tab.url
                            }
                        });
                    } catch (error) {
                        // 侧边栏可能未打开，忽略错误
                    }
                }
            }
        }
    } catch (error) {
        console.error('处理标签页激活失败:', error);
    }
});

// 监听来自内容脚本和侧边栏的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true; // 保持消息通道开放
});

// 处理消息
async function handleMessage(message, sender, sendResponse) {
    try {
        switch (message.type) {
            case 'GET_CURRENT_TAB_INFO':
                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                sendResponse({
                    success: true,
                    data: activeTab ? {
                        id: activeTab.id,
                        title: activeTab.title,
                        url: activeTab.url
                    } : null
                });
                break;
                
            case 'OPEN_URL':
                const { url, newTab } = message;
                if (newTab) {
                    await chrome.tabs.create({ url });
                } else {
                    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (currentTab) {
                        await chrome.tabs.update(currentTab.id, { url });
                    }
                }
                sendResponse({ success: true });
                break;
                
            case 'SHOW_NOTIFICATION':
                const { title, message: notificationMessage, iconUrl } = message;
                await chrome.notifications.create({
                    type: 'basic',
                    iconUrl: iconUrl || 'icons/icon48.png',
                    title: title || 'AI工具分组管理器',
                    message: notificationMessage
                });
                sendResponse({ success: true });
                break;
                
            case 'GET_STORAGE_DATA':
                const { keys } = message;
                const data = await chrome.storage.local.get(keys);
                sendResponse({ success: true, data });
                break;
                
            case 'SET_STORAGE_DATA':
                const { data: storageData } = message;
                await chrome.storage.local.set(storageData);
                sendResponse({ success: true });
                break;
                
            case 'PAGE_INFO_DETECTED':
                // 来自内容脚本的页面信息
                const { pageInfo } = message;
                console.log('检测到页面信息:', pageInfo);
                
                // 可以在这里处理页面信息，比如自动添加收藏等
                sendResponse({ success: true });
                break;
                
            default:
                console.warn('未知消息类型:', message.type);
                sendResponse({ success: false, error: '未知消息类型' });
        }
    } catch (error) {
        console.error('处理消息失败:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// 从URL检测AI工具类型
function detectAIToolFromUrl(url) {
    if (!url) return null;
    
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        // AI工具域名映射
        const aiToolDomains = {
            'chatgpt': ['chat.openai.com', 'chatgpt.com'],
            'claude': ['claude.ai'],
            'gemini': ['gemini.google.com', 'bard.google.com'],
            'poe': ['poe.com']
        };
        
        for (const [toolKey, domains] of Object.entries(aiToolDomains)) {
            if (domains.some(domain => hostname.includes(domain))) {
                return toolKey;
            }
        }
    } catch (error) {
        console.error('解析URL失败:', error);
    }
    
    return null;
}

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        console.log('存储数据已更改:', changes);
        
        // 向所有侧边栏实例广播数据变化
        chrome.runtime.sendMessage({
            type: 'STORAGE_CHANGED',
            changes: changes
        }).catch(() => {
            // 忽略没有接收者的错误
        });
    }
});

// 监听通知点击
chrome.notifications.onClicked.addListener((notificationId) => {
    // 点击通知时打开侧边栏
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.sidePanel.open({ windowId: tabs[0].windowId }).catch(console.error);
        }
    });
});

// 定期清理过期数据（可选）
setInterval(async () => {
    try {
        const data = await chrome.storage.local.get('aiGroups');
        if (data.aiGroups && Array.isArray(data.aiGroups)) {
            // 这里可以添加清理逻辑，比如删除过期的收藏等
            // 目前暂不实现自动清理
        }
    } catch (error) {
        console.error('清理数据失败:', error);
    }
}, 24 * 60 * 60 * 1000); // 每24小时执行一次

// 处理扩展卸载（清理工作）
chrome.runtime.onSuspend.addListener(() => {
    console.log('插件即将被挂起');
    // 这里可以做一些清理工作
});

// 错误处理
chrome.runtime.onStartup.addListener(() => {
    console.log('Chrome启动，插件已加载');
});

// 导出函数供测试使用（在开发环境中）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        detectAIToolFromUrl,
        initializeExtension,
        handleExtensionUpdate
    };
}

console.log('AI工具分组管理器背景脚本已加载');