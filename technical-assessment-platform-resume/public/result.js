async function loadResult(){
    const res=await fetch('/api/result');
    const data=await res.json();
    if(!res.ok)
        {
            document.getElementById('resultCard').innerHTML=
            `<p class="error">
            ${data.error||'No result available'}
            </p>`;
            return;
        }
            const{score,total,passed,threshold,perLangStats}=data;
            const card=document.getElementById('resultCard');
            card.innerHTML=`<p><strong>Score:</strong> ${score}% (out of ${total} questions)
            </p>
            <p>
            <strong>
               Status:
            </strong> 
            ${
                passed?'<span class="pill success">Passed</span>':
                '<span class="pill danger">Below Threshold</span>'}
            </p>
                <p>
                  <strong>Threshold:
                   </strong> ${threshold}%
                </p>
            <div class="stats">${Object.entries
                    (perLangStats||{})
                    .map(([lang,s])=>`<div class="stat">
                <span>
                    ${lang}
                </span>
                <strong>${s.correct}/${s.total}
                </strong></div>`).join('')}
                </div>
                <p>${passed?'Congratulations! You can upload your resume below.':'Thanks for taking the assessment. Please try again later.'}
                </p>`;
                if(passed){document.getElementById('uploadSection').style.display='block';}
                document.getElementById('reviewSection').style.display='block';await loadReview();
            }async function loadReview(){
                const res=await fetch('/api/review');
                const data=await res.json();
                if(!res.ok)return;
                const list=document.getElementById('reviewList');
                list.innerHTML=data.review.map(
                    item=>`<div class="review-item 
                    ${item.isCorrect?'correct':'incorrect'}">
                    <div class="q">
                    <strong>[${item.language}]
                    </strong> ${item.question}
                    </div>
                    <div class="a">Your answer: ${item.yourAnswer??'<em>Not answered</em>'}
                    </div>
                <div class="c">Correct answer: 
                <strong>${item.correctAnswer}
                </strong></div></div>`)
                .join('');}async function uploadResume(){
                    const fileInput=document.getElementById('resume');
                    const msg=document.getElementById('uploadMsg');
                    msg.textContent='';if(!fileInput.files.length){
                        msg.textContent='Please choose a file.';
                        msg.classList.add('error');
                        return;
                    }
                    const file=fileInput.files[0];
                    const allowed=['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                    if(!allowed.includes(file.type)){msg.textContent='Only PDF, DOC, DOCX files are allowed.';
                        msg.classList.add('error');
                        return;
                    }
                    if(file.size>5*1024*1024){msg.textContent='File too large (max 5MB).';
                        msg.classList.add('error');
                        return;
                    }
                    const form=new FormData();
                    form.append('resume',file);
                    const res=await fetch('/api/upload',{method:'POST',body:form});
                    const data=await res.json();
                    if(!res.ok){msg.textContent=data.error||'Upload failed';
                        msg.classList.add('error');
                        return;
                    }
                    msg.textContent='Upload successful!';
                    msg.classList.remove('error');
                    msg.classList.add('success');
                }
document.getElementById('uploadBtn').addEventListener('click',uploadResume);
loadResult();