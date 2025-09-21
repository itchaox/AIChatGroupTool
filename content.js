// AI工具分组管理器 - 内容脚本
// 用于页面信息获取和AI工具识别

(function() {
    'use strict';
    
    // 防止重复注入
    if (window.aiGroupManagerContentScript) {
        return;
    }
    window.aiGroupManagerContentScript = true;
    
    // 当前页面的AI工具类型
    let currentAITool = null;
    
    // AI工具配置
    const AI_TOOLS_CONFIG = {
        chatgpt: {
            name: 'ChatGPT',
            domains: ['chat.openai.com', 'chatgpt.com'],
            selectors: {
                title: 'h1, .text-xl, [data-testid="conversation-title"], .font-semibold',
                conversationList: '[data-testid="conversation-turn"], .group, .flex.flex-col',
                newChatButton: '[data-testid="new-chat-button"], button[aria-label*="New chat"], .btn-primary'
            },
            urlPatterns: {
                conversation: /\/c\/([a-zA-Z0-9-]+)/,
                chat: /chat\.openai\.com|chatgpt\.com/
            }
        },
        claude: {
            name: 'Claude',
            domains: ['claude.ai'],
            selectors: {
                title: 'h1, .text-xl, [data-testid="chat-title"]',
                conversationList: '.conversation-item, .chat-item',
                newChatButton: 'button[aria-label*="New conversation"], .new-chat-btn'
            },
            urlPatterns: {
                conversation: /\/chat\/([a-zA-Z0-9-]+)/,
                chat: /claude\.ai/
            }
        },
        gemini: {
            name: 'Gemini',
            domains: ['gemini.google.com', 'bard.google.com'],
            selectors: {
                title: 'h1, .conversation-title, [data-testid="title"]',
                conversationList: '.conversation-item, .chat-history-item',
                newChatButton: 'button[aria-label*="New chat"], .new-conversation-btn'
            },
            urlPatterns: {
                conversation: /\/chat\/([a-zA-Z0-9-]+)/,
                chat: /gemini\.google\.com|bard\.google\.com/
            }
        },
        poe: {
            name: 'Poe',
            domains: ['poe.com'],
            selectors: {
                title: 'h1, .ChatHeader_chatTitle, [data-testid="chat-title"]',
                conversationList: '.ChatHistoryItem, .conversation-item',
                newChatButton: 'button[aria-label*="New chat"], .new-chat-button'
            },
            urlPatterns: {
                conversation: /poe\.com\/([a-zA-Z0-9-]+)/,
                chat: /poe\.com/
            }
        }
    };
    
    // 检测当前页面的AI工具类型
    function detectCurrentAITool() {
        const hostname = window.location.hostname.toLowerCase();
        
        for (const [toolKey, config] of Object.entries(AI_TOOLS_CONFIG)) {
            if (config.domains.some(domain => hostname.includes(domain))) {
                currentAITool = toolKey;
                return toolKey;
            }
        }
        
        return null;
    }
    
    // 获取页面信息
    function getPageInfo() {
        if (!currentAITool) {
            return null;
        }
        
        const config = AI_TOOLS_CONFIG[currentAITool];
        const pageInfo = {
            aiTool: currentAITool,
            url: window.location.href,
            title: document.title,
            timestamp: Date.now()
        };
        
        try {
            // 尝试获取对话标题
            const titleElement = document.querySelector(config.selectors.title);
            if (titleElement) {
                const titleText = titleElement.textContent?.trim();
                if (titleText && titleText !== document.title) {
                    pageInfo.conversationTitle = titleText;
                }
            }
            
            // 检测是否是对话页面
            const conversationMatch = window.location.href.match(config.urlPatterns.conversation);
            if (conversationMatch) {
                pageInfo.conversationId = conversationMatch[1];
                pageInfo.type = 'conversation';
            } else {
                pageInfo.type = 'main';
            }
            
            // 获取页面描述（如果有的话）
            const metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription) {
                pageInfo.description = metaDescription.content;
            }
            
        } catch (error) {
            console.error('获取页面信息失败:', error);
        }
        
        return pageInfo;
    }
    
    // 监听页面变化（SPA应用）
    function observePageChanges() {
        let lastUrl = window.location.href;
        let lastTitle = document.title;
        
        // 使用MutationObserver监听DOM变化
        const observer = new MutationObserver((mutations) => {
            const currentUrl = window.location.href;
            const currentTitle = document.title;
            
            // 检查URL或标题是否发生变化
            if (currentUrl !== lastUrl || currentTitle !== lastTitle) {
                lastUrl = currentUrl;
                lastTitle = currentTitle;
                
                // 延迟一点时间等待页面完全加载
                setTimeout(() => {
                    sendPageInfoToBackground();
                }, 1000);
            }
        });
        
        // 开始观察
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'id']
        });
        
        // 监听popstate事件（浏览器前进后退）
        window.addEventListener('popstate', () => {
            setTimeout(() => {
                sendPageInfoToBackground();
            }, 500);
        });
        
        // 监听pushstate和replacestate（SPA路由变化）
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function(...args) {
            originalPushState.apply(history, args);
            setTimeout(() => {
                sendPageInfoToBackground();
            }, 500);
        };
        
        history.replaceState = function(...args) {
            originalReplaceState.apply(history, args);
            setTimeout(() => {
                sendPageInfoToBackground();
            }, 500);
        };
    }
    
    // 向背景脚本发送页面信息
    function sendPageInfoToBackground() {
        const pageInfo = getPageInfo();
        if (pageInfo) {
            try {
                chrome.runtime.sendMessage({
                    type: 'PAGE_INFO_DETECTED',
                    pageInfo: pageInfo
                }).catch(error => {
                    console.error('发送页面信息失败:', error);
                });
            } catch (error) {
                console.error('发送消息失败:', error);
            }
        }
    }
    
    // 监听来自背景脚本的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
            switch (message.type) {
                case 'GET_PAGE_INFO':
                    const pageInfo = getPageInfo();
                    sendResponse({ success: true, data: pageInfo });
                    break;
                    
                case 'REFRESH_PAGE_INFO':
                    sendPageInfoToBackground();
                    sendResponse({ success: true });
                    break;
                    
                case 'SCROLL_TO_ELEMENT':
                    const { selector } = message;
                    const element = document.querySelector(selector);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        sendResponse({ success: true });
                    } else {
                        sendResponse({ success: false, error: '元素未找到' });
                    }
                    break;
                    
                case 'CLICK_NEW_CHAT':
                    if (currentAITool) {
                        const config = AI_TOOLS_CONFIG[currentAITool];
                        const newChatButton = document.querySelector(config.selectors.newChatButton);
                        if (newChatButton) {
                            newChatButton.click();
                            sendResponse({ success: true });
                        } else {
                            sendResponse({ success: false, error: '新对话按钮未找到' });
                        }
                    } else {
                        sendResponse({ success: false, error: '未识别的AI工具' });
                    }
                    break;
                    
                default:
                    sendResponse({ success: false, error: '未知消息类型' });
            }
        } catch (error) {
            console.error('处理消息失败:', error);
            sendResponse({ success: false, error: error.message });
        }
        
        return true; // 保持消息通道开放
    });
    
    // 添加自定义样式（如果需要的话）
    function addCustomStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* AI工具分组管理器 - 内容脚本样式 */
            .ai-group-manager-highlight {
                outline: 2px solid #007bff !important;
                outline-offset: 2px !important;
                border-radius: 4px !important;
            }
            
            .ai-group-manager-fade {
                opacity: 0.6 !important;
                transition: opacity 0.3s ease !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // 工具函数：高亮元素
    function highlightElement(selector, duration = 3000) {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('ai-group-manager-highlight');
            setTimeout(() => {
                element.classList.remove('ai-group-manager-highlight');
            }, duration);
        }
    }
    
    // 工具函数：检查页面是否完全加载
    function waitForPageLoad() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve, { once: true });
            }
        });
    }
    
    // 初始化内容脚本
    async function initContentScript() {
        try {
            // 等待页面加载完成
            await waitForPageLoad();
            
            // 检测AI工具类型
            const aiTool = detectCurrentAITool();
            if (!aiTool) {
                console.log('当前页面不是支持的AI工具');
                return;
            }
            
            console.log(`检测到AI工具: ${aiTool}`);
            
            // 添加自定义样式
            addCustomStyles();
            
            // 开始监听页面变化
            observePageChanges();
            
            // 发送初始页面信息
            setTimeout(() => {
                sendPageInfoToBackground();
            }, 1000);
            
            console.log('AI工具分组管理器内容脚本初始化完成');
            
        } catch (error) {
            console.error('初始化内容脚本失败:', error);
        }
    }
    
    // 页面卸载时的清理工作
    window.addEventListener('beforeunload', () => {
        console.log('页面即将卸载，清理内容脚本');
    });
    
    // 错误处理
    window.addEventListener('error', (event) => {
        console.error('内容脚本发生错误:', event.error);
    });
    
    // 启动内容脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initContentScript);
    } else {
        initContentScript();
    }
    
    // 导出函数供调试使用
    window.aiGroupManagerDebug = {
        detectCurrentAITool,
        getPageInfo,
        sendPageInfoToBackground,
        highlightElement,
        currentAITool: () => currentAITool
    };
    
})();

console.log('AI工具分组管理器内容脚本已加载');