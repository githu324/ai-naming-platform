// 前端交互：提交需求 → 调用 /api/generate → 渲染 3 组名字；加载历史记录

const form = document.getElementById('naming-form');
const submitBtn = document.getElementById('submit-btn');
const formTip = document.getElementById('form-tip');

const resultEmpty = document.getElementById('result-empty');
const resultLoading = document.getElementById('result-loading');
const resultList = document.getElementById('result-list');

const historyList = document.getElementById('history-list');
const refreshBtn = document.getElementById('refresh-history');

const CATEGORY_TEXT = {
  baby: '宝宝起名',
  brand: '店铺/品牌起名',
  nickname: '网名/昵称',
  pet: '宠物名字',
  product: '产品/项目名',
};

const CANDIDATE_TEXT = ['候选一', '候选二', '候选三'];

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  submitBtn.disabled = true;
  formTip.textContent = '';
  resultEmpty.classList.add('hidden');
  resultLoading.classList.remove('hidden');
  resultList.innerHTML = '';

  try {
    const resp = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await resp.json();
    if (!resp.ok || !json.ok) throw new Error(json.error || '生成失败');

    renderNames(json.names);
    if (!json.dbConfigured) {
      formTip.textContent = '提示：当前未配置 Supabase，本次结果不会保存到历史记录。';
    }
    await loadHistory();
  } catch (err) {
    formTip.textContent = err.message || '网络异常，请稍后重试';
    resultEmpty.classList.remove('hidden');
  } finally {
    resultLoading.classList.add('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = '生成 3 组名字';
  }
});

function renderNames(names) {
  resultList.innerHTML = '';
  names.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'name-card';

    const head = document.createElement('div');
    head.className = 'name-card-head';
    head.innerHTML = `
      <span class="badge">${CANDIDATE_TEXT[idx] || `候选${idx + 1}`}</span>
      <span class="name-text"></span>
      <span class="pinyin"></span>
    `;
    head.querySelector('.name-text').textContent = item.name || '（未命名）';
    head.querySelector('.pinyin').textContent = item.pinyin || '';

    const meaning = document.createElement('p');
    meaning.className = 'meaning';
    meaning.innerHTML = '<strong>寓意：</strong>';
    meaning.appendChild(document.createTextNode(item.meaning || ''));

    card.appendChild(head);
    card.appendChild(meaning);

    if (item.characters && item.characters.length) {
      const charsBox = document.createElement('div');
      charsBox.className = 'characters';
      item.characters.forEach((c) => {
        const el = document.createElement('div');
        el.className = 'char-item';
        el.innerHTML = `<span class="ch"></span><span class="desc"></span>`;
        el.querySelector('.ch').textContent = c.char;
        el.querySelector('.desc').textContent = c.explanation || '';
        charsBox.appendChild(el);
      });
      card.appendChild(charsBox);
    }

    resultList.appendChild(card);
  });
}

// ---------- 历史记录 ----------
refreshBtn.addEventListener('click', () => loadHistory());

async function loadHistory() {
  historyList.innerHTML = '<p class="muted">加载中…</p>';
  try {
    const resp = await fetch('/api/history?limit=15');
    const json = await resp.json();
    if (!json.ok) throw new Error(json.error || '加载失败');

    if (!json.dbConfigured) {
      historyList.innerHTML =
        '<p class="muted">尚未配置 Supabase 环境变量，历史记录功能不可用；配置后可自动展示。</p>';
      return;
    }
    if (!json.records.length) {
      historyList.innerHTML = '<p class="muted">暂无历史记录。</p>';
      return;
    }

    historyList.innerHTML = '';
    json.records.forEach((r) => historyList.appendChild(buildHistoryItem(r)));
  } catch (err) {
    historyList.innerHTML = `<p class="muted">历史记录加载失败：${err.message}</p>`;
  }
}

function buildHistoryItem(r) {
  const item = document.createElement('div');
  item.className = 'history-item';

  const head = document.createElement('button');
  head.type = 'button';
  head.className = 'history-item-head';
  const time = new Date(r.created_at).toLocaleString('zh-CN', { hour12: false });
  const detailBits = [
    CATEGORY_TEXT[r.category] || r.category,
    r.surname ? `${r.surname}姓` : '',
    r.stylePreference ? r.stylePreference : '',
  ].filter(Boolean);
  head.innerHTML = `
    <span>${detailBits.join(' · ')}</span>
    <span class="meta">${time} ▾</span>
  `;

  const body = document.createElement('div');
  body.className = 'history-item-body';

  if (r.requirements) {
    const reqP = document.createElement('p');
    reqP.className = 'muted';
    reqP.textContent = `补充要求：${r.requirements}`;
    body.appendChild(reqP);
  }

  const namesBox = document.createElement('div');
  namesBox.className = 'history-names';
  (r.names || []).forEach((n) => {
    const chip = document.createElement('div');
    chip.className = 'history-name-chip';
    chip.innerHTML = '<span class="hn-name"></span><small></small>';
    chip.querySelector('.hn-name').textContent = n.name || '';
    chip.querySelector('small').textContent = n.meaning || '';
    namesBox.appendChild(chip);
  });
  body.appendChild(namesBox);

  head.addEventListener('click', () => item.classList.toggle('open'));

  item.appendChild(head);
  item.appendChild(body);
  return item;
}

// 页面打开时尝试加载历史
loadHistory();
