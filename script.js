import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, getDocs, deleteDoc, doc, query, orderBy  } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB_hiukwxN-ftyTQjhn7bwkvq0UntljUW4",
  authDomain: "ideation-tool-8bcf3.firebaseapp.com",
  projectId: "ideation-tool-8bcf3"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const tableBody = document.querySelector("#resultsTable tbody");
const detailModal = document.getElementById("detailModal");
const detailContent = document.getElementById("detailContent");
const closeModal = document.getElementById("closeModal");
closeModal.onclick = () => (detailModal.style.display = "none");

async function fetchResults(selectedTopic = "전체") {
  tableBody.innerHTML = ""; // 🔄 기존 테이블 초기화

  // 🔡 이름(username) 기준으로 정렬 쿼리
  const q = query(collection(db, "results"), orderBy("username"));
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach((doc) => {
    const data = doc.data();

    const tr = document.createElement("tr");

    // 평균 별점 계산 (기존 코드 유지)
    const scores = Object.values(data.results || {}).map(q => {
      const ratings = q.rating || {};
      const ratingValues = Object.values(ratings)
        .filter(v => !isNaN(parseFloat(v)))
        .map(v => parseFloat(v));
      const sum = ratingValues.reduce((a, b) => a + b, 0);
      return ratingValues.length ? sum / ratingValues.length : null;
    });
    const validScores = scores.filter(s => s !== null);
    const avgScore = validScores.length
      ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2)
      : "-";

    // 표에 추render
    tr.innerHTML = `
      <td>${data.username}</td>
      <td>${data.topic}</td>
      
      <td>${avgScore}</td>
      <td>
        <button class="view-btn" data-id="${doc.id}">보기</button>
        <button class="delete-btn" data-id="${doc.id}" disabled>삭제</button>
      </td>
    `;

    tr.querySelector(".view-btn").onclick = () => {
      const formattedHTML = formatDetailHTML(data);
      detailContent.innerHTML = formattedHTML;
      detailModal.style.display = "block";
    };

    tableBody.appendChild(tr);
  });
    allRowsData = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const uniqueNames = new Set(allRowsData.map(item => item.username));
  document.getElementById("participantCount").textContent = `총 참여자 수: ${uniqueNames.size}명`;


  buildTopicChips();
  renderTable();

}

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
  let html = `<h2 style="color:#333 !important;">🧑‍💻 <span style="color:#333;">${data.username}</span> <span style="color:#333333; !important">| 주제: </span><span style="color:#333;">${data.topic}</span></h2>`;
  // html += `<p><b>제출 시간:</b> ${new Date(data.timestamp).toLocaleString()}</p><hr/>`;

  Object.entries(results)
    .sort(([a], [b]) => parseInt(a.replace('Q', '')) - parseInt(b.replace('Q', '')))
    .forEach(([qKey, qData]) => {
      const title = questionTitles[qKey] || "";
      html += `<h3>📌 <span style="color:#1A75FF;">${qKey}${title ? `. ${title}` : ""}</span></h3>`;
      html += `<p style="white-space:pre-wrap;  word-break:break-word;  line-height:1.5;"><b style="color:#777; font-size:12px;">프롬프트 입력</b> <pre style="background:#f0f0f0; padding:10px; white-space:pre-wrap;  line-height:1.5;">${qData.input || '-'}</pre></p>`;
      html += `<p><b style="color:#777; font-size:12px;">GPT 응답</b> <br/><pre style="background:#f0f0f0; padding:10px; white-space:pre-wrap;  line-height:1.5;">${qData.gptResponse || '-'}</pre></p>`;

      if (qData.rating) {
        html += `<p><b>⭐ 별점 평가:</b><ul>`;
        Object.entries(qData.rating).forEach(([category, score]) => {
          html += `<li>${category}: ${score}</li>`;
        });
        html += `</ul></p>`;
      }

      if (qData.기타_의견) {
        html += `<p><b style="color:#1A75FF;">💬 기타 의견:</b> ${qData.기타_의견}</p>`;
      }

      html += `<hr/>`;
    });

  return html;
}

fetchResults();
tableBody.addEventListener("click", async (e) => {
  if (e.target.classList.contains("delete-btn")) {
    const docId = e.target.dataset.id;
    const confirmed = confirm("정말 이 데이터를 삭제하시겠습니까?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "results", docId)); // ✅ Firestore에서 삭제
      e.target.closest("tr").remove();            // ✅ 화면에서도 제거
      alert("삭제가 완료되었습니다!");
    } catch (err) {
      console.error("❌ 삭제 실패:", err);
      alert("삭제 중 오류가 발생했습니다. 콘솔을 확인해주세요.");
    }
  }
});

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

//칩 필터링
let allRowsData = [];
let activeTopic = "ALL"; 
let searchKeyword = "";   

let activeCriterion = "전체"; // 롱포맷 칩 상태
let currentFilteredForLong = [];

function buildTopicChips() {
  const wrap = document.getElementById("topicChips");
  if (!wrap) return;
  wrap.innerHTML = "";

  const topics = Array.from(new Set(allRowsData.map(r => r.topic).filter(t => t && t !== "-")));

  // 주제 라벨 매핑 (더 생기면 여기 추가)#
  const topicLabels = {
    "직장인의 일상 속 스트레스를 완화할 수 있는 디자인 아이디어": "직장인 스트레스 완화",
    "독거노인의 일상적 어려움을 해소하기 위한 디자인 아이디어": "독거노인 어려움 해소"
  };

  wrap.appendChild(makeChip("전체", "ALL"));

  topics.sort((a, b) => a.localeCompare(b, 'ko'));
  topics.forEach(t => {
    const label = topicLabels[t] || t; // 매핑된 라벨 or 전체 텍스트
    wrap.appendChild(makeChip(label, t));
  });

  highlightActiveChip();
}

function highlightActiveChip() {
  document.querySelectorAll(".chip").forEach(chip => {
    chip.classList.toggle("chip-active", chip.dataset.value === activeTopic);
  });
}

function renderTable() {
  tableBody.innerHTML = "";
  const filtered = activeTopic === "ALL" ? allRowsData : allRowsData.filter(r => r.topic === activeTopic);

   const uniqueNames = new Set(
      filtered
    .map(item => item.username?.trim()) // ✅ 공백 제거 시간
    .filter(name => !!name)             // ✅ 빈 값 제거
);
  document.getElementById("participantCount").textContent =
    `총 참여자 수: 25명`;
    //  `총 참여자 수: ${uniqueNames.size}명`;


  filtered.forEach(data => {
    const tr = document.createElement("tr");

    const scores = Object.values(data.results || {}).map(q => {
      const ratings = q.rating || {};
      const ratingValues = Object.values(ratings)
        .filter(v => !isNaN(parseFloat(v)))
        .map(v => parseFloat(v));
      const sum = ratingValues.reduce((a, b) => a + b, 0);
      return ratingValues.length ? sum / ratingValues.length : null;
    });
    const validScores = scores.filter(s => s !== null);
    const avgScore = validScores.length
      ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2)
      : "-";

    tr.innerHTML = `
      <td>${data.username}</td>
      <td>${data.topic}</td>
      <td>${avgScore}</td>
      <td>
        <button class="view-btn" data-id="${data.id}">보기</button>
        <button class="delete-btn" data-id="${data.id}">삭제</button>
      </td>
    `;

    tr.querySelector(".view-btn").onclick = () => {
      const formattedHTML = formatDetailHTML(data);
      detailContent.innerHTML = formattedHTML;
      detailModal.style.display = "block";
    };

    tr.querySelector(".delete-btn").onclick = async () => {
      const confirmed = confirm("정말 이 데이터를 삭제하시겠습니까?");
      if (!confirmed) return;

      try {
        await deleteDoc(doc(db, "results", data.id));
        alert("삭제가 완료되었습니다!");
        await fetchResults(); // 새로고침
      } catch (err) {
        console.error("❌ 삭제 실패:", err);
        alert("삭제 중 오류가 발생했습니다. 콘솔을 확인해주세요.");
      }
    };

    tableBody.appendChild(tr);
    
  });
  renderAverageMatrixFromDataset(filtered);  // 기존 유지

currentFilteredForLong = filtered;         // ✅ 현재 데이터 저장(칩 클릭 시 재렌더용)
buildCriteriaChipsForLong(filtered);       // ✅ 칩 목록/하이라이트 갱신
renderLongFormatTable(filtered); 
}

// //삭제 잠금
// const unlockCheckbox = document.getElementById("unlockDelete");
// const deleteButtons = document.querySelectorAll(".delete-btn");

// unlockCheckbox.addEventListener("change", (e) => {
//   const unlocked = e.target.checked;
//   deleteButtons.forEach(btn => {
//     btn.disabled = !unlocked;
//   });
// });


// // 삭제 잠금 해제 체크박스에 이벤트 달기tr.innerHTML
// document.getElementById("unlockDelete").addEventListener("change", (e) => {
//   const unlocked = e.target.checked;
//   document.querySelectorAll(".delete-btn").forEach(btn => {
//     btn.disabled = !unlocked; // 체크 되어 있으면 활성화, 아니면 잠금
//   });
// });

// 🔹 질문 라벨 전역으로 승격 (formatDetailHTML 안에만 있던 걸 밖으로 빼서 재사용)
const QUESTION_TITLES = {
  Q1: "배경/니즈",
  Q2: "기대 효과",
  Q3: "결과물 형태",
  Q4: "필요 기술",
  Q5: "제약 조건",
  Q6: "예시/사례"
};
const QUESTION_ORDER_KEYS = ["Q1","Q2","Q3","Q4","Q5","Q6"]; // 표의 세로 순서 고정

// 🔹 숫자 유틸
const mean = (arr) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
const toNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

// 🔹 평균 매트릭스 렌더 (현재 필터 결과 기반)
function renderAverageMatrixFromDataset(dataset) {
  const matrix = {};                  // { [질문라벨]: { [평가항목]: number[] } }
  const criteriaSet = new Set();      // 가로축 후보 모으기

  // 초기 행 준비
  QUESTION_ORDER_KEYS.forEach(qk => {
    const label = `${qk}. ${QUESTION_TITLES[qk] || ""}`.trim();
    matrix[label] = {};
  });

  // 데이터 누적
  dataset.forEach(row => {
    const results = row.results || {};
    QUESTION_ORDER_KEYS.forEach(qk => {
      const qData = results[qk];
      if (!qData || !qData.rating) return;

      for (const [crit, scoreRaw] of Object.entries(qData.rating)) {
        const score = toNum(scoreRaw);
        if (score === null) continue;

        const rowLabel = `${qk}. ${QUESTION_TITLES[qk] || ""}`.trim();
        if (!matrix[rowLabel][crit]) matrix[rowLabel][crit] = [];
        matrix[rowLabel][crit].push(score);
        criteriaSet.add(crit);
      }
    });
  });

  // 가로축(평가항목) 정렬: 한글/영문 상관없이 알파벳/사전순
  const CRITERIA = Array.from(criteriaSet).sort((a,b)=>a.localeCompare(b,'ko'));

  // 테이블 HTML 생성
  let html = `
    <table class="avg-matrix" style="width:100%; border-collapse:collapse; background:#fff;">
      <thead>
        <tr>
          <th style="padding:12px; border-bottom:1px solid #ccc; text-align:left;">질문항목</th>
          ${CRITERIA.map(c=>`<th style="padding:12px; border-bottom:1px solid #ccc;">${c}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;

  QUESTION_ORDER_KEYS.forEach(qk => {
    const rowLabel = `${qk}. ${QUESTION_TITLES[qk] || ""}`.trim();
    html += `<tr><td style="padding:12px; border-bottom:1px solid #eee; text-align:left;">${rowLabel}</td>`;
    CRITERIA.forEach(c => {
      const arr = matrix[rowLabel][c] || [];
      const cell = arr.length ? mean(arr).toFixed(2) : "-";
      html += `<td style="padding:12px; border-bottom:1px solid #eee;">${cell}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;

  const mount = document.getElementById('avgMatrix');
  if (mount) mount.innerHTML = html;
}


renderTable()



// 🔹 롱포맷 표: P#, S#, Q# 순서로 정렬하여 출력
function renderLongFormatTable(dataset) {
  const mount = document.getElementById('longTable');
  if (!mount) return;

  // 참가자 이름 정렬 후 P1, P2, ...
  const participants = Array.from(new Set(
    dataset.map(r => (r.username || "-").trim())
  )).sort((a,b) => a.localeCompare(b, 'ko'));
  const pidByName = new Map(participants.map((name, i) => [name, `P${i+1}`]));

  // 주제 매핑
  const SUBJECT_MAP = {
    "독거노인의 일상적 어려움을 해소하기 위한 디자인 아이디어": "S1",
    "직장인의 일상 속 스트레스를 완화할 수 있는 디자인 아이디어": "S2"
  };
  const SUBJECT_ORDER = ["S1","S2"];

  // Q 정렬용
  const qOrder = (q) => {
    const n = parseInt(String(q).replace(/^\D+/, ''), 10);
    return Number.isFinite(n) ? n : 999;
  };

  // 참가자+주제별 데이터 매핑
  const docsByPS = new Map();
  dataset.forEach(row => {
    const name = (row.username || "-").trim();
    const pid = pidByName.get(name);
    const s = SUBJECT_MAP[row.topic] || null;
    if (!pid || !s) return;
    docsByPS.set(`${pid}_${s}`, row);
  });

  const rows = [];
  participants.forEach(name => {
    const pid = pidByName.get(name);
    SUBJECT_ORDER.forEach(s => {
      const row = docsByPS.get(`${pid}_${s}`);
      if (!row) return;

      const results = row.results || {};
      QUESTION_ORDER_KEYS.forEach(qKey => {
        const qData = results[qKey];
        if (!qData || !qData.rating) return;

        Object.entries(qData.rating).forEach(([criterion, raw]) => {
          // 칩 필터 적용
          if (activeCriterion !== "전체" && criterion !== activeCriterion) return;

          const score = parseFloat(raw);
          if (!Number.isFinite(score)) return;

          rows.push({
            participant: pid,
            subject: s,
            question: `Q${qOrder(qKey)}`,
            criterion,
            score
          });
        });
      });
    });
  });

  // 정렬: 참가자 → 주제 → 질문 → 평가항목
  rows.sort((a,b) => {
    if (a.participant !== b.participant) return a.participant.localeCompare(b.participant, 'ko', {numeric:true});
    if (a.subject !== b.subject) return a.subject.localeCompare(b.subject, 'ko', {numeric:true});
    if (a.question !== b.question) return qOrder(a.question) - qOrder(b.question);
    return a.criterion.localeCompare(b.criterion, 'ko');
  });

  // 표 렌더링
  mount.innerHTML = `
    <table class="avg-matrix" style="width:100%; border-collapse:collapse; background:#fff;">
      <thead>
        <tr>
          <th style="padding:12px; border-bottom:1px solid #ccc;">참가자</th>
          <th style="padding:12px; border-bottom:1px solid #ccc;">주제</th>
          <th style="padding:12px; border-bottom:1px solid #ccc;">질문</th>
          <th style="padding:12px; border-bottom:1px solid #ccc;">평가항목</th>
          <th style="padding:12px; border-bottom:1px solid #ccc;">점수</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td style="padding:12px; border-bottom:1px solid #eee; text-align:center;">${r.participant}</td>
            <td style="padding:12px; border-bottom:1px solid #eee; text-align:center;">${r.subject}</td>
            <td style="padding:12px; border-bottom:1px solid #eee; text-align:center;">${r.question}</td>
            <td style="padding:12px; border-bottom:1px solid #eee; text-align:center;">${r.criterion}</td>
            <td style="padding:12px; border-bottom:1px solid #eee; text-align:center;">${r.score}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}



//

// 데이터에서 동적으로 평가항목 수집
function collectCriteriaList(dataset) {
  const set = new Set();
  dataset.forEach(row => {
    const results = row.results || {};
    Object.values(results).forEach(qData => {
      const r = qData?.rating || {};
      Object.keys(r).forEach(k => set.add(k));
    });
  });
  return ["전체", ...Array.from(set).sort((a,b)=>a.localeCompare(b,'ko'))];
}

function buildCriteriaChipsForLong(dataset) {
  const wrap = document.getElementById("criteriaChips");
  if (!wrap) return;
  wrap.innerHTML = "";

  const list = collectCriteriaList(dataset);
  list.forEach(c => {
    const chip = document.createElement("div");
    chip.className = "chip" + (c === activeCriterion ? " chip-active" : "");
    chip.textContent = c;
    chip.addEventListener("click", () => {
      activeCriterion = c;
      // 하이라이트 업데이트
      document.querySelectorAll("#criteriaChips .chip").forEach(x => {
        x.classList.toggle("chip-active", x.textContent === activeCriterion);
      });
      // 롱포맷만 갱신 (평균 매트릭스는 그대로)
      renderLongFormatTable(currentFilteredForLong);
    });
    wrap.appendChild(chip);
  });
}

