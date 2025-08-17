import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, getDocs, deleteDoc, doc, query, orderBy  } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// 🔹 Firebase 초기화
const firebaseConfig = {
  apiKey: "AIzaSyB_hiukwxN-ftyTQjhn7bwkvq0UntljUW4",
  authDomain: "ideation-tool-8bcf3.firebaseapp.com",
  projectId: "ideation-tool-8bcf3"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔹 DOM 요소
const tableBody = document.querySelector("#resultsTable tbody");
const detailModal = document.getElementById("detailModal");
const detailContent = document.getElementById("detailContent");
const closeModal = document.getElementById("closeModal");
closeModal.onclick = () => (detailModal.style.display = "none");

// 🔹 전역 상태
let allRowsData = [];
let activeTopic = "ALL";
let activeCriterion = "전체";
let currentFilteredForLong = [];

// =============================================
// 1. Firestore 데이터 fetch
// =============================================
async function fetchResults() {
  tableBody.innerHTML = "";

  const q = query(collection(db, "results"), orderBy("username"));
  const querySnapshot = await getDocs(q);

  allRowsData = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const uniqueNames = new Set(allRowsData.map(item => item.username));
  document.getElementById("participantCount").textContent =
    `총 참여자 수: ${uniqueNames.size}명`;

  buildTopicChips();
  renderTable();
}
fetchResults();

// =============================================
// 2. 상세보기 모달 HTML
// =============================================
function formatDetailHTML(data) {
  const results = data.results || {};
  const questionTitles = {
    Q1: "생성하고자 하는 아이디어가 필요한 이유는 무엇인가요?",
    Q2: "해당 아이디어가 실현되었을 때 어떤 효과가 있을까요?",
    Q3: "이 아이디어의 최종 결과물은 어떤 형태로 제공되나요?",
    Q4: "이 아이디어를 구현하기 위해 필요한 핵심 기술은 무엇인가요?",
    Q5: "실현 과정에서 고려해야 할 제약 조건이 있다면 무엇인가요?",
    Q6: "비슷한 사례나 참고할 만한 예시가 있다면 알려주세요."
  };

  let html = `<h2>🧑‍💻 ${data.username} | 주제: ${data.topic}</h2>`;

  Object.entries(results)
    .sort(([a], [b]) => parseInt(a.replace('Q', '')) - parseInt(b.replace('Q', '')))
    .forEach(([qKey, qData]) => {
      const title = questionTitles[qKey] || "";
      html += `<h3>📌 ${qKey}${title ? `. ${title}` : ""}</h3>`;
      html += `<p><b>프롬프트 입력</b><br/><pre>${qData.input || '-'}</pre></p>`;
      html += `<p><b>GPT 응답</b><br/><pre>${qData.gptResponse || '-'}</pre></p>`;

      if (qData.rating) {
        html += `<p><b>⭐ 별점 평가:</b><ul>`;
        Object.entries(qData.rating).forEach(([category, score]) => {
          html += `<li>${category}: ${score}</li>`;
        });
        html += `</ul></p>`;
      }

      if (qData.기타_의견) {
        html += `<p><b>💬 기타 의견:</b> ${qData.기타_의견}</p>`;
      }

      html += `<hr/>`;
    });

  return html;
}

// =============================================
// 3. 토픽 칩
// =============================================
function makeChip(label, value) {
  const chip = document.createElement("div");
  chip.className = "chip" + (value === "ALL" ? " chip-all" : "");
  chip.textContent = label;
  chip.dataset.value = value;
  chip.addEventListener("click", () => {
    activeTopic = (activeTopic === value) ? "ALL" : value;
    highlightActiveChip();
    renderTable();
  });
  return chip;
}

function buildTopicChips() {
  const wrap = document.getElementById("topicChips");
  if (!wrap) return;
  wrap.innerHTML = "";

  const topics = Array.from(new Set(allRowsData.map(r => r.topic).filter(t => t && t !== "-")));

  const topicLabels = {
    "직장인의 일상 속 스트레스를 완화할 수 있는 디자인 아이디어": "직장인 스트레스 완화",
    "독거노인의 일상적 어려움을 해소하기 위한 디자인 아이디어": "독거노인 어려움 해소"
  };

  wrap.appendChild(makeChip("전체", "ALL"));
  topics.sort((a, b) => a.localeCompare(b, 'ko'));
  topics.forEach(t => wrap.appendChild(makeChip(topicLabels[t] || t, t)));

  highlightActiveChip();
}

function highlightActiveChip() {
  document.querySelectorAll(".chip").forEach(chip => {
    chip.classList.toggle("chip-active", chip.dataset.value === activeTopic);
  });
}

// =============================================
// 4. 질문/평가 관련 상수
// =============================================
const QUESTION_TITLES = {
  Q1: "배경/니즈",
  Q2: "기대 효과",
  Q3: "결과물 형태",
  Q4: "필요 기술",
  Q5: "제약 조건",
  Q6: "예시/사례"
};
const QUESTION_ORDER_KEYS = ["Q1","Q2","Q3","Q4","Q5","Q6"];

// =============================================
// 5. 평균 매트릭스 (셀 하이라이트 포함)
// =============================================
function mean(arr) {
  return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
}

function renderAverageMatrixFromDataset(dataset) {
  const matrix = {};
  const criteriaSet = new Set();

  QUESTION_ORDER_KEYS.forEach(qk => {
    const label = `${qk}. ${QUESTION_TITLES[qk] || ""}`.trim();
    matrix[label] = {};
  });

  dataset.forEach(row => {
    const results = row.results || {};
    QUESTION_ORDER_KEYS.forEach(qk => {
      const qData = results[qk];
      if (!qData?.rating) return;
      for (const [crit, raw] of Object.entries(qData.rating)) {
        const n = parseFloat(raw);
        if (!Number.isFinite(n)) continue;
        const rowLabel = `${qk}. ${QUESTION_TITLES[qk] || ""}`.trim();
        if (!matrix[rowLabel][crit]) matrix[rowLabel][crit] = [];
        matrix[rowLabel][crit].push(n);
        criteriaSet.add(crit);
      }
    });
  });

  const CRITERIA = Array.from(criteriaSet).sort((a,b)=>a.localeCompare(b,'ko'));

  let html = `
    <table class="avg-matrix">
      <thead>
        <tr>
          <th>질문항목</th>
          ${CRITERIA.map(c=>`<th>${c}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;

  QUESTION_ORDER_KEYS.forEach(qk => {
    const rowLabel = `${qk}. ${QUESTION_TITLES[qk] || ""}`.trim();
    html += `<tr><td>${rowLabel}</td>`;
    CRITERIA.forEach(c => {
      const arr = matrix[rowLabel][c] || [];
      const cell = arr.length ? mean(arr).toFixed(2) : "-";
      html += `<td>${cell}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;

  const mount = document.getElementById('avgMatrix');
  if (mount) {
    mount.innerHTML = html;
    applyAvgMatrixThresholds({ gte: 4.0, lte: 3.5 });
  }
}

function applyAvgMatrixThresholds({ gte = 4.0, lte = 3.5 } = {}) {
  const table = document.querySelector('#avgMatrix table');
  if (!table) return;
  [...table.tBodies[0].rows].forEach(tr => {
    [...tr.cells].slice(1).forEach(td => {
      const v = parseFloat(td.textContent);
      td.classList.remove('high-blue','low-red');
      if (!Number.isFinite(v)) return;
      if (v >= gte) td.classList.add('high-blue');
      else if (v <= lte) td.classList.add('low-red');
    });
  });
}

// =============================================
// 6. 롱포맷 테이블
// =============================================
function renderLongFormatTable(dataset) {
  const mount = document.getElementById('longTable');
  if (!mount) return;

  const participants = Array.from(new Set(dataset.map(r => (r.username||"-").trim()))).sort((a,b)=>a.localeCompare(b,'ko'));
  const pidByName = new Map(participants.map((name,i)=>[name,`P${i+1}`]));

  const SUBJECT_MAP = {
    "독거노인의 일상적 어려움을 해소하기 위한 디자인 아이디어": "S1",
    "직장인의 일상 속 스트레스를 완화할 수 있는 디자인 아이디어": "S2"
  };
  const SUBJECT_ORDER = ["S1","S2"];

  const qOrder = (q) => parseInt(String(q).replace(/^\D+/,""),10) || 999;

  const docsByPS = new Map();
  dataset.forEach(row => {
    const pid = pidByName.get((row.username||"-").trim());
    const s = SUBJECT_MAP[row.topic];
    if (pid && s) docsByPS.set(`${pid}_${s}`, row);
  });

  const rows = [];
  participants.forEach(name=>{
    const pid = pidByName.get(name);
    SUBJECT_ORDER.forEach(s=>{
      const row = docsByPS.get(`${pid}_${s}`);
      if (!row) return;
      const results = row.results || {};
      QUESTION_ORDER_KEYS.forEach(qKey=>{
        const qData = results[qKey];
        if (!qData?.rating) return;
        Object.entries(qData.rating).forEach(([crit,raw])=>{
          if (activeCriterion!=="전체" && crit!==activeCriterion) return;
          const score = parseFloat(raw);
          if (!Number.isFinite(score)) return;
          rows.push({participant:pid,subject:s,question:`Q${qOrder(qKey)}`,criterion:crit,score});
        });
      });
    });
  });

  rows.sort((a,b)=>{
    if (a.participant!==b.participant) return a.participant.localeCompare(b.participant,'ko',{numeric:true});
    if (a.subject!==b.subject) return a.subject.localeCompare(b.subject,'ko',{numeric:true});
    if (a.question!==b.question) return qOrder(a.question)-qOrder(b.question);
    return a.criterion.localeCompare(b.criterion,'ko');
  });

  mount.innerHTML = `
    <table class="avg-matrix">
      <thead>
        <tr>
          <th>참가자</th><th>주제</th><th>질문</th><th>평가항목</th><th>점수</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r=>`
          <tr>
            <td>${r.participant}</td>
            <td>${r.subject}</td>
            <td>${r.question}</td>
            <td>${r.criterion}</td>
            <td>${r.score}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
}

// =============================================
// 7. 평가항목 칩
// =============================================
function collectCriteriaList(dataset) {
  const set = new Set();
  dataset.forEach(row=>{
    Object.values(row.results||{}).forEach(qData=>{
      Object.keys(qData?.rating||{}).forEach(k=>set.add(k));
    });
  });
  return ["전체",...Array.from(set).sort((a,b)=>a.localeCompare(b,'ko'))];
}

function buildCriteriaChipsForLong(dataset) {
  const wrap = document.getElementById("criteriaChips");
  if (!wrap) return;
  wrap.innerHTML = "";
  collectCriteriaList(dataset).forEach(c=>{
    const chip=document.createElement("div");
    chip.className="chip"+(c===activeCriterion?" chip-active":"");
    chip.textContent=c;
    chip.addEventListener("click",()=>{
      activeCriterion=c;
      document.querySelectorAll("#criteriaChips .chip").forEach(x=>{
        x.classList.toggle("chip-active",x.textContent===activeCriterion);
      });
      renderLongFormatTable(currentFilteredForLong);
    });
    wrap.appendChild(chip);
  });
}

// =============================================
// 8. 메인 테이블 렌더
// =============================================
function renderTable() {
  tableBody.innerHTML="";
  const filtered = activeTopic==="ALL" ? allRowsData : allRowsData.filter(r=>r.topic===activeTopic);

  filtered.forEach(data=>{
    const tr=document.createElement("tr");

    const scores=Object.values(data.results||{}).map(q=>{
      const vals=Object.values(q.rating||{}).map(v=>parseFloat(v)).filter(v=>!isNaN(v));
      return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
    });
    const valid=scores.filter(s=>s!==null);
    const avg=valid.length?(valid.reduce((a,b)=>a+b,0)/valid.length).toFixed(2):"-";

    tr.innerHTML=`
      <td>${data.username}</td>
      <td>${data.topic}</td>
      <td>${avg}</td>
      <td>
        <button class="view-btn" data-id="${data.id}">보기</button>
        <button class="delete-btn" data-id="${data.id}">삭제</button>
      </td>
    `;
    tr.querySelector(".view-btn").onclick=()=>{
      detailContent.innerHTML=formatDetailHTML(data);
      detailModal.style.display="block";
    };
    tr.querySelector(".delete-btn").onclick=async()=>{
      if(!confirm("정말 이 데이터를 삭제하시겠습니까?")) return;
      await deleteDoc(doc(db,"results",data.id));
      alert("삭제 완료");
      await fetchResults();
    };
    tableBody.appendChild(tr);
  });

  renderAverageMatrixFromDataset(filtered);
  currentFilteredForLong=filtered;
  buildCriteriaChipsForLong(filtered);
  renderLongFormatTable(filtered);
}
