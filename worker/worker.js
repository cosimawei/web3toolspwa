/**
 * Cloudflare Workers - 配置同步代理
 *
 * 环境变量配置：
 * - USER_PASSWORD: 同步密码
 * - GITHUB_TOKEN: GitHub Personal Access Token
 * - GITHUB_REPO: 仓库路径 (如: cosimawei/my-private-config)
 *
 * API端点：
 * GET  /sync?pwd=xxx  - 获取配置
 * POST /sync?pwd=xxx  - 更新配置
 */

const CONFIG_FILE = 'config.json';

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Only handle /sync endpoint
    if (url.pathname !== '/sync') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Not Found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify password
    const pwd = url.searchParams.get('pwd');
    if (!pwd || pwd !== env.USER_PASSWORD) {
      return new Response(JSON.stringify({
        success: false,
        error: '密码错误'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      if (request.method === 'GET') {
        // 获取配置
        const config = await getConfig(env);
        return new Response(JSON.stringify({
          success: true,
          data: config
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } else if (request.method === 'POST') {
        // 更新配置
        const body = await request.json();
        await saveConfig(env, body);
        return new Response(JSON.stringify({
          success: true,
          message: '配置已更新'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } else {
        return new Response(JSON.stringify({
          success: false,
          error: 'Method Not Allowed'
        }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// 从 GitHub 获取配置
async function getConfig(env) {
  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${CONFIG_FILE}`,
    {
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CloudflareWorker'
      }
    }
  );

  if (response.status === 404) {
    // 文件不存在，返回空配置
    return {
      version: '1.0',
      lastUpdate: null,
      data: {}
    };
  }

  if (!response.ok) {
    throw new Error('获取配置失败');
  }

  const data = await response.json();
  const content = atob(data.content);
  // 修复UTF-8解码
  const decodedContent = decodeURIComponent(escape(content));
  return JSON.parse(decodedContent);
}

// 保存配置到 GitHub
async function saveConfig(env, config) {
  // 先获取现有文件的 SHA（如果存在）
  let sha = null;
  try {
    const existing = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${CONFIG_FILE}`,
      {
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CloudflareWorker'
        }
      }
    );
    if (existing.ok) {
      const data = await existing.json();
      sha = data.sha;
    }
  } catch (e) {
    // 文件不存在，忽略
  }

  // 更新时间戳
  config.lastUpdate = new Date().toISOString();

  // 创建或更新文件
  const body = {
    message: `Update config - ${new Date().toLocaleString('zh-CN')}`,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(config, null, 2)))),
    ...(sha && { sha })
  };

  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${CONFIG_FILE}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CloudflareWorker',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`保存失败: ${error}`);
  }
}
