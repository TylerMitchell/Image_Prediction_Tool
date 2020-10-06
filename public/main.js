let moreData = undefined;

let chartContainer = document.querySelector("#imagePredictionContainer");
let maxW = 600;
const div = d3.create("div")
    .style("font", "10px sans-serif")
    .style("text-align", "right")
    .style("color", "black")
    .style("width", `${maxW}px`)
    .style("background-color", "black")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("justify-content", "flex-start");

chartContainer.appendChild( div.node() );

function renderBarChart(info, regions){
    let tW = document.getElementById("selectedImage").width;
    let tH = document.getElementById("selectedImage").height;
    
    let boxes = d3.select("#imageContainer").selectAll('div');
    let tr = d3.select("#imageContainer").selectAll('div').data(regions);
    tr.style("left", r => Math.floor(r.left_col * tW) + "px")
        .style("top", r => Math.floor(r.top_row * tH) + "px")
        .style("width", r => Math.floor((r.right_col - r.left_col) * tW) + "px")
        .style("height", r => Math.floor((r.bottom_row - r.top_row) * tH) + "px");
    tr.exit().remove();
    tr.enter().append('div')
        .attr("class", "areaContainer")
        .attr("id", r => `${r.id}` )
        .style("left", r => Math.floor(r.left_col * tW) + "px")
        .style("top", r => Math.floor(r.top_row * tH) + "px")
        .style("width", r => Math.floor((r.right_col - r.left_col) * tW) + "px")
        .style("height", r => Math.floor((r.bottom_row - r.top_row) * tH) + "px");
    
    let t = div.selectAll("div").data(info)
        .text(d => `(%${(d[1]*100).toFixed(2)}) ${d[0]}`)
        .style("width", d => `${Math.floor( d[1]*(maxW-4)) }px`)
        .style("background", d => `linear-gradient(90deg, red 85%, rgba(0,${d[1]*255},0,1))`);
    t.exit().remove();
    t.enter().append('div')
        .attr("class", "probabilityBar")
        .style("padding", "3px")
        .style("margin", "1px")
        .style("width", "0px")
        .style("height", "20px")
        .text(d => `(%${(d[1]*100).toFixed(2)}) ${d[0]}`)
        .style("width", d => `${Math.floor( d[1]*(maxW-4)) }px`)
        .style("background", d => `linear-gradient(90deg, red 85%, rgba(0,${d[1]*255},0,1))`)
        .transition().duration(2000).ease(d3.easeLinear).style("width", d => `${Math.floor(d[1]*(maxW-4))}px`);
    div.selectAll('div')
        .on("mouseover", function(e, d){ d3.select(`#region${d[2]}`).style("border", "3px solid green"); })
        .on("mouseout", function(e, d){ d3.select(`#region${d[2]}`).style("border", "1px solid red"); });
}

function buildAndSendRequest(urlOrImg, isBase64 = false){
    let modelId = "cb649131aa72f86911815b0fe98dee55";
    let versionId = "13c11ec702854e97a695ca2a0f809a95";
    let apiKey = window.clarifAI;

    let partial = `{"url": "${urlOrImg}"}`;
    if(isBase64){ partial = `{"base64": "${urlOrImg}"}`; }

    fetch(`https://api.clarifai.com/v2/models/${modelId}/versions/${versionId}/outputs`, {
        body: `{"inputs": [{"data": {"image": ${partial}}}]}`,
        headers: {
            Authorization: `Key ${apiKey}`,
            "Content-Type": "application/json"
        },
        method: "POST"
    }).then( (r) => {
        return r.json();
    }).then( (data) => {
        moreData = data;
        let conceptProbabilityArr = [];
        let regionBoxes = [];
        if(data.outputs && data.outputs[0].data.regions){
            conceptProbabilityArr = data.outputs[0].data.regions.map( (region, ind) => {
                return region.data.concepts.map( (item) => {
                    return [item.name, item.value, ind];
                });
            })
            regionBoxes = data.outputs[0].data.regions.map( (region, i) => {
                let tr = region.region_info.bounding_box;
                tr.id = `region${i}`;
                return tr;
            });
        }
        
        conceptProbabilityArr = conceptProbabilityArr.flat();
        conceptProbabilityArr.sort( (arr1, arr2) => { return (arr1[1] > arr2[1]) ? -1 : 1; });
        renderBarChart( conceptProbabilityArr, regionBoxes );

        if( conceptProbabilityArr.length < 1 ){ alert("ClarifAI didn't recognize anything in your image!"); }
    })
    .catch( (err) => {
        alert("ClarifAI didn't like your request! ");
        console.log("Error in response from ClarifAI! ", err);
    });
}

function fileToBase64(file, callback) { //TODO: uncouple this function
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function () {
        selectedImage.src = reader.result;
        let b64 = (reader.result).split(',')[1];
        callback(b64, true);
    };
    reader.onerror = function (err) {
        alert("There was an error with reading the file you selected!");
        console.log('fileToBase64 Error: ', err);
    };
}

window.onload = function(){
    let imageURLInput = document.querySelector("#imageURLInput");
    let randomImageButton = document.querySelector("#randomImageButton");
    let fileInput = document.querySelector("#fileInputHide");

    let selectedImage = document.querySelector("#selectedImage");
    imageURLInput.addEventListener("keydown", (e) => {
        if(e.keyCode == 13){ //enter key was pressed
            selectedImage.src = e.target.value;
            buildAndSendRequest(e.target.value);
        }
    });

    randomImageButton.addEventListener("click", (e) => {
        fetch("https://source.unsplash.com/random").then( (resp) => {
            selectedImage.src = resp.url;
            buildAndSendRequest(resp.url);
        });
    });

    fileInput.addEventListener("change", (e) => {
        fileToBase64(e.target.files[0], buildAndSendRequest)
    })
};