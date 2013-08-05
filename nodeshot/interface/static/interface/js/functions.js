var csrftoken = $.cookie('csrftoken');

var markerToRemove //If users insert a new marker previous one has to be deleted from map
var nodeRatingAVG // Rating data has to be globally available for rating plugin to correctly work

var markerMap={} //Object holding all nodes'slug and a reference to their marker



 /* LAYERS LIST CREATION
  * ====================*/

//Create a list with layers' slug and name
function getLayerListSlug(layers,cssLayer) {
	layerList=[];
	for(var i=0;i<layers.length;i++){
		layerList[i]={}
		var obj = layers[i];
		for(var key in obj){
			var attrName = key;
			var attrValue = obj[key];
			if (key=='slug' || key== 'name' ) {
				layerList[i][key]=attrValue;
			}	    
		}
	}
	var options = $("#"+cssLayer);	
	$.each(layerList, function(obj,city) {
		options.append($("<option />").val(city.slug).text(city.name));
		});
}

//Create a list with layers' id and name
function getLayerListId(layers,cssLayer) {
	layerList=[];
	for(var i=0;i<layers.length;i++){
		layerList[i]={}
		var obj = layers[i];
		for(var key in obj){
			var attrName = key;
			var attrValue = obj[key];
			if (key=='id' || key== 'name' ) {
				layerList[i][key]=attrValue;
			}	    
		}
	}
	var options = $("#"+cssLayer);	
	$.each(layerList, function(obj,city) {
		options.append($("<option />").val(city.id).text(city.name));
		});
}

 /* INSERTION OF NODES ON MAP ON PAGE LOAD
  * ====================================== */
 
var colors={"provinciawifi":"blue","rome":"green","pisa":"red","viterbo":"yellow"}

// get color depending on node's slug
function getColor(d) {
	//alert (d)
	return d == "rome" ? 'green' :
	       d == "pisa" ? 'red'   :
	       d == "viterbo" ? 'yellow'   :
	       d == "test" ? 'grey'   :
			  '#FFEDA0';
}

function style(feature) {
	
		return {
			weight: 1,
			opacity: 1,
			color: 'black',
			clickable: false,
			dashArray: '3',
			fillOpacity: 0.2,
			fillColor: getColor(feature.properties.slug)
		};
	}

function loadLayersArea(layers) {
/*
 * Puts layer areas on map
 */

var allLayersArea= []

	for (var i in layers.features)
		{
		
		var color=colors[layers.features[i]["properties"].slug];
		layers.features[i]["properties"].color=color
		var newArea= L.geoJson(layers.features[i],{style: style}).addTo(map);
		var newAreaKey=[layers.features[i]["properties"].name]+' Area';
		overlaymaps[newAreaKey]=newArea;
		allLayersArea[i]=newArea;
		}
	return allLayersArea;

}

function loadLayers(layers) {
/*
 * Takes all node of a layer and puts them on map in a Leaflet Clustered group
 */
var allLayers= []
	for (var i in layers)
		{
		
		var color=colors[layers[i].slug];
		clusterClass=layers[i].slug;//CSS class with same name of the layer
		//Creates a Leaflet cluster group styled with layer's colour
		var newCluster = createCluster(clusterClass);
		//Loads nodes in the cluster
		var newClusterNodes=   getData(window.__BASEURL__+'api/v1/layers/'+layers[i].slug+'/geojson/');
		var newClusterLayer=loadNodes(newClusterNodes,color)	;
		newCluster.addLayer(newClusterLayer);
		//Adds cluster to map
		map.addLayer(newCluster);
		//Creates map controls for the layer
		var newClusterKey=layers[i].name;
		overlaymaps[newClusterKey]=newCluster;
		allLayers[i]=newCluster;
		}
	return allLayers;

}


function  createCluster(clusterClass) {
/*
* Creates cluster group
*/
var newCluster=
new L.MarkerClusterGroup(
		{
		iconCreateFunction: function (cluster) {
					return L.divIcon({
						html: cluster.getChildCount(),
						className: clusterClass,
						iconSize: L.point(30, 30) });
					},
		spiderfyOnMaxZoom: true, showCoverageOnHover: true, zoomToBoundsOnClick: true
			}
			);
return newCluster;	
}


function loadNodes(newClusterNodes,color){
/*
* Load nodes in cluster group and defines click properties for the popup window
*/
	var layer=
	L.geoJson(newClusterNodes, {
		
	onEachFeature: function (feature, layer) {
		layer.on('click', function (e) {
			populateNodeDiv(feature.properties.slug,1);
			this.bindPopup(nodeDiv);
			populateRating(feature.properties.slug,nodeDiv,nodeRatingAVG)
				});
		
		},
	pointToLayer: function (feature, latlng) {
				var marker= new
					L.circleMarker(latlng, {
					radius: 6,
					fillColor: color,
					color: color,
					weight: 1,
					opacity: 1,
					fillOpacity: 0.8
				});
				markerMap[feature.properties.slug] = marker;
				return marker;
			}
		
	});
	
	return layer;	
}


 /* USER'S INSERTION OF NODES ON MAP 
  * ==================================== */

function onMapClick(e) {
/*
 *Creates marker object
 */
	if (markerToRemove) {
		map.removeLayer(markerToRemove);
	}
	
	markerLocation = e.latlng
	//markerLocationtoString = e.latlng.toString();
	
	marker = new L.Marker(markerLocation);
	markerToRemove=marker
	var popupelem= document.createElement('div');
	popupelem.id="insertMarker"
	popupelem.innerHTML+='Is position correct ?<br>';
	popupelem.innerHTML+='<button id="confirm" class=\'confirm_marker\' onclick=markerConfirm(markerLocation)>Confirm</button>&nbsp;';
	popupelem.innerHTML+='<button class=\'remove_marker\' onclick=markerDelete(marker)>Delete</b>';
	
    // $('div#movemenexttolink').css({left: offsetsForLink.left + 60, top: offsetsForLink.top + 10});
	
	map
		
		.addLayer(marker);
	popup
		.setLatLng(e.latlng)
		.setContent(popupelem)
		.openOn(map);
	
}

function markerDelete(marker) {
/*
 * Deletes inserted marker from map
 */
	map.removeLayer(marker);
	map.closePopup();	
}


function markerConfirm(marker) {
/*
 * Opens node's insertion form
 */
	var areaLayer=L.geoJson(geojsonlayers);
	results = leafletPip.pointInLayer(markerLocation, areaLayer,false);
	
	$("#insertMarker").html('');
	
	switch(results.length)
{
case 0:
  /*alert('Nodes must be inserted inside existing layers\' area');
		return (false);*/
	var LayerList=[];
	var htmlRadio='';
	for(var i=0;i<layers.length;i++){
		layerList[i]={}
		if (layers[i].area === null) {
			var id=layers[i].id;
			var name=layers[i].name;
			htmlRadio+=name+' <input type="radio" name="layer" value="'+id+','+name+'"/><br>'
			
		}
		
	}
	htmlRadio+='<button id="sendLayer">Go</button>';
	
	//alert(htmlRadio)
	var htmlText='You clicked outside layer\' area.<br>Choose a no-area layer:<br>'
	$("#insertMarker").append(htmlText);
	$("#insertMarker").append(htmlRadio);
	$("#sendLayer").click(function() {

	var layerValues=$("input[name=\'layer\']:checked").val().split(",");
	openInsertDiv(marker,layerValues[0],layerValues[1]);
	});
  break;
case 1:
	var htmlText='Node is included in this layer:<br> <strong>'+results[0].feature.properties.name+'</strong>'
	$("#insertMarker").append(htmlText);
	openInsertDiv(marker,results[0].feature.properties.id,results[0].feature.properties.name);
	//map.closePopup();
  break;
default:
	var htmlRadioArea='';
	for (var i in results) {
		console.log(results[i].feature.properties.name);
		id=results[i].feature.properties.id
		name=results[i].feature.properties.name
		htmlRadioArea+=name+' <input type="radio" name="layer" value="'+id+','+name+'"/><br>'
		
	}
	htmlRadioArea+='<button id="sendLayer">Go</button>';
	var htmlText='Node coords are included in more then a layer.<br>Choose one:<br>'
	$("#insertMarker").append(htmlText);
	$("#insertMarker").append(htmlRadioArea);
	$("#sendLayer").click(function() {

	var layerValues=$("input[name=\'layer\']:checked").val().split(",");
	openInsertDiv(marker,layerValues[0],layerValues[1]);
	});
}

}

function openInsertDiv(latlng,layerID,layerName){
/*
 *Creates node's insertion form
 */
	var latlngToString = latlng.toString();
	var arrayLatLng=latlngToString.split(",");
	var lat=arrayLatLng[0].slice(7);
	var lng=arrayLatLng[1].slice(0,-1);

	$("#valori").html('');
	htmlText='<strong>Insert node details</strong><br>';
	htmlText+='<div class="label" >Layer</div>';
	htmlText+='<input class="input" id="layerToInsert" >';
	htmlText+='<input type="hidden" id="layerIdToInsert" >';
	htmlText+='<div class="label" >Name</div>';
	htmlText+='<input class="input" id="nodeToInsertName">';
	htmlText+='<div class="label" >Address </div>';
	htmlText+='<div id="loadingAddress" >Loading...</div>';
	htmlText+='<textarea class="input" id="nodeToInsertAddress"></textarea>';
    	htmlText+='<div class="label" >Lat</div>';    
	htmlText+='<input class="input" id="nodeToInsertLat"><br>';
	htmlText+='<div class="label" >Lng</div>';
	htmlText+='<input class="input" id="nodeToInsertLng">';
	htmlText+='<button class="vote" onclick=postNode();>Insert node</button>';
	var nodeInsertDiv = $("<div>", {id: "nodeInsertDiv"});
	
	$(nodeInsertDiv).append(htmlText);
	$("#valori").append(nodeInsertDiv);
	$("#nodeToInsertLng").val(lng);
	$("#nodeToInsertLat").val(lat);
	$("#layerToInsert").val(layerName);
	$("#layerIdToInsert").val(layerID);
	$('#layerToInsert').attr('readonly', true);
	$('#nodeToInsertLng').attr('readonly', true);
	$('#nodeToInsertLat').attr('readonly', true);

	getAddress();
	
        }
	

function postNode() {
/*
 * Inserts node in DB and displays it on map
 */
	var nodeToInsert={}
	var lng=$("#nodeToInsertLng").val();
	var lat=$("#nodeToInsertLat").val();
	var latlngToInsert=lat+'\,'+lng;
	nodeToInsert["layer"]=$("#layerIdToInsert").val();
	nodeToInsert["name"]=$("#nodeToInsertName").val();
	nodeToInsert["slug"]=convertToSlug($("#nodeToInsertName").val())
	nodeToInsert["address"]=$("#nodeToInsertAddress").val();
	nodeToInsert["coords"]=latlngToInsert;

	var latlng=new L.LatLng(lat, lng);
	var ok=confirm("Add node?");
	if (ok==true)
		{
		$.ajax({
		type: "POST",
		url: 'http://localhost:8000/api/v1/nodes/',
		data: nodeToInsert,
		dataType: 'json',
		success: function(response){
		clearLayers();
		map.removeControl(mapControl)
		mapLayersArea=loadLayersArea(geojsonlayers);
		mapLayers=loadLayers(layers);
		mapControl=L.control.layers(baseMaps,overlaymaps).addTo(map);
		var newMarker=L.marker(latlng).addTo(map);
		populateNodeDiv(nodeToInsert["slug"],1);
		//newMarker.bindPopup("Node added");
		newMarker.bindPopup(nodeDiv).openPopup();
		populateRating(nodeToInsert["slug"],nodeDiv,nodeRatingAVG);
		$("#nodeInsertDiv").html('Node inserted')
		    }
		
	      });
	  }
}

function clearLayers()  {
/*
 * Delete all layers from map
 */
for ( var x in mapLayers) {
		mapLayers[x].clearLayers();
	    }
        
for ( var y in mapLayersArea) {
	mapLayersArea[y].clearLayers();
	    }
        }

 /* DISPLAYING OF NODES' PROPERTIES 
  * ================================ */
 
 
function populateNodeDiv(nodeSlug,create) {
/*
 * Populates a Div with node's participation data
 * 
 */
 
	if (create ==1) {
		nodeDiv = document.createElement('div');
		nodeDiv.id=nodeSlug;	
	}
	
	
	
	if (participation === "True") {
		
	
		var nodeSettings=   getData(window.__BASEURL__+'api/v1/nodes/'+nodeSlug+'/participation_settings/');
		
		
		
		var voting_allowed=nodeSettings.participation_settings["voting_allowed"]
		var rating_allowed=nodeSettings.participation_settings["rating_allowed"]
		var comments_allowed=nodeSettings.participation_settings["comments_allowed"]
		console.log(comments_allowed,rating_allowed,voting_allowed)
		var node=   getData(window.__BASEURL__+'api/v1/nodes/'+nodeSlug+'/participation/');
		var nodeName=node.name;
		var nodeAddress=node.address;
	
		$(nodeDiv).append('<strong>'+nodeName+'</strong><br>');
		$(nodeDiv).append(nodeAddress+'<br>');
		
	
		
		var nodeRatingCount=node.participation.rating_count;
		var nodeLikes=node.participation.likes;
		var nodeDislikes=node.participation.dislikes;
		var nodeVoteCount=nodeLikes+nodeDislikes;
		var nodeComments=node.participation.comment_count;
		
		nodeRatingAVG=node.participation.rating_avg;
		alert(rating_allowed)
		if (rating_allowed == true) {
			
			$(nodeDiv).append('<strong>Rating:</strong><br>');
			$(nodeDiv).append('<div id="star"></div>');
		}
		
		if (voting_allowed == true) {
				
			$(nodeDiv).append('<strong>Votes:</strong><br>');
			$(nodeDiv).append('In favour: <strong>'+nodeLikes+'</strong><br>');
			$(nodeDiv).append('Against: <strong>'+nodeDislikes+'</strong><br>');
			
			var like=1
			var dislike=-1
			$(nodeDiv).append('<button class="vote" onclick=postVote(\''+nodeSlug+'\',\''+like+'\')>In favour</button>');
			$(nodeDiv).append('<button class="vote" onclick=postVote(\''+nodeSlug+'\',\''+dislike+'\')>Against</button><br>');
		}
		
		if (comments_allowed == true) {
			
			$(nodeDiv).append('<strong>Comments:</strong><br>');
			$(nodeDiv).append('<a onclick=showComments("'+nodeSlug+'");>comments: '+ nodeComments +'</a><br>');
		}
		

	
		populateRating(nodeSlug,nodeRatingAVG)
				
	
	}
	else
	{
		var node=   getData(window.__BASEURL__+'api/v1/nodes/'+nodeSlug);
		var nodeName=node.name;
		var nodeAddress=node.address;
	
		$(nodeDiv).append('<strong>'+nodeName+'</strong><br>');
		$(nodeDiv).append(nodeAddress+'<br>');
	}
	return(nodeDiv,nodeRatingAVG)

}


function showComments(nodeSlug) {
/*
 * Populates a Div with node's comments
 */

	$("#valori").html('');
	var commentsDiv = $("<div>", {id: "comments"});
	var node=nodeSlug
	url=window.__BASEURL__+'api/v1/nodes/'+node+'/comments/?format=json';
	comments=   getData(url);
	
	htmlText='Comments on node: <strong>'+node+'</strong><br>';
	htmlText+='<div id="comment" >';
	for (var i = 0; i < comments.length; i++) { 
		var comment=comments[i].text;
		var username=comments[i].username;
		var added=comments[i].added;
		htmlText+='<div  class="comment_div">';
		htmlText+='<span class="comment_user">'+username+'</span>';	
		htmlText+='<div class="comment_text">';
		htmlText+=escapeHtml(comment);
		htmlText+='</div>';
		htmlText+='<span class="comment_date">'+added+'</span>';	
		htmlText+='</div>';
		}
	htmlText+='</div><div id="pagingControls"></div>'
	
	$(commentsDiv).html(htmlText);
	
	
	htmlText='<hr>Add your:<br>';
	htmlText+='<textarea id="commentText"></textarea><br>';
	htmlText+='<button onclick=postComment("'+node+'");>Add comment</button>';
	$(commentsDiv).append(htmlText);
	$("#valori").append(commentsDiv);
	
	pager = new Imtech.Pager();//Paging of comments in div
	pager.paragraphsPerPage = 5; // set amount elements per page
	pager.pagingContainer = $('#comment'); // set of main container
	pager.paragraphs = $('div.comment_div', pager.pagingContainer); // set of required containers
	pager.showPage(1);
	
}

 /* INSERTION OF NODES' PARTICIPATION DATA 
  * ====================================== */
 
function postComment(nodeSlug) {
/*
 * post a comment
 */
	comment=$("#commentText").val();
	var ok=confirm("Add comment for this node?");
	if (ok==true)
	{
	$.ajax({
		type: "POST",
		url: window.__BASEURL__+'api/v1/nodes/'+nodeSlug+'/comments/',
		data: { "text": comment},
		dataType: 'json',
		success: function(response){	
			var nodeDiv=  $("#" + nodeSlug);
			$(nodeDiv).html('');
			populateNodeDiv (nodeSlug,0);
			populateRating(nodeSlug,nodeDiv,nodeRatingAVG);
			showComments(nodeSlug);
			alert("Your comment has been added!");
			 }
        
		 });
	}
}

function postVote(nodeSlug,vote) {
/*
 * post a vote
 */
	var ok=confirm("Add vote " + vote + " for this node?");
	if (ok==true)
	{
	$.ajax({
		type: "POST",
		url: 'http://localhost:8000/api/v1/nodes/'+nodeSlug+'/votes/',
		data: { "vote": vote},
		dataType: 'json',
		success: function(response){	
			var nodeDiv=  $("#" + nodeSlug);
			$(nodeDiv).html('')
			populateNodeDiv (nodeSlug,0);
			populateRating(nodeSlug,nodeDiv,nodeRatingAVG);
			alert("Your vote has been added!");
			}
        
		});
	  }
}

function postRating(nodeSlug,rating) {
/*
 * post a rating
 */
	var ok=confirm("Add rating " + rating + " for this node?");
	if (ok==true)
	{
		$.ajax({
	    type: "POST",
	    url: 'http://localhost:8000/api/v1/nodes/'+nodeSlug+'/ratings/',
	    data: { "value": rating},
	    dataType: 'json',
	    success: function(response){	
			var nodeDiv=  $("#" + nodeSlug);
			$(nodeDiv).html('')
			populateNodeDiv (nodeSlug,0);
			populateRating(nodeSlug,nodeDiv,nodeRatingAVG)
			alert("Your rating has been added!");
			}	    
	});
	}
}

function populateRating(nodeSlug,nodeDiv,nodeRatingAVG) {
/*
 * Show/update rating data of a node
 */	
	x=$(nodeDiv).find('#star');
	$(x).raty(  {
			score: nodeRatingAVG,
			number:10,
			path: $.myproject.STATIC_URL+'interface/js/vendor/images',
			 click: function(score) {
				postRating(nodeSlug,score );
				}
			
		}
		  );
	 };

 /* CREATE AND SHOW NODE LIST
  * =========================*/

function createNodeList() {
    layer=$("#selectLayerNodeList").val();
    if (layer != " ") {
	
    $.ajax({
        type: 'GET',
        url: window.__BASEURL__+'api/v1/layers/'+layer+'/nodes',
        dataType: 'json',
        //data: JSON.stringify(bounds),
        contentType: 'application/json; charset=utf-8',
        success: function (result) {
            addToList(result)
        },
    })
    }
}

function addToList(data) {
	$("#valori").html('');
	$("#nodelist").html('');
    for (var i = 0; i < data.nodes["results"].length; i++) {
        var nodes = data.nodes["results"][i];
        $("#nodelist").append('<a href="#" class="list-link" data-slug='+nodes["slug"]+' >' + nodes.name + '</a><br>')
    }
    $('a.list-link').click(function (e) {
        var slug = $(this).data( 'slug' );
        var marker = markerMap[slug];
	//console.log(marker.toGeoJSON());
        //marker.openPopup(marker.getLatLng());
	populateNodeDiv(slug,1);
        marker.addTo(map)
	marker.bindPopup(nodeDiv)
	populateRating(slug,nodeDiv,nodeRatingAVG)
	marker.openPopup()
    })
}

 /* AUTHENTICATION
  * ============== */
	 
function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}


function sameOrigin(url) {
    // test that a given url is a same-origin URL
    // url could be relative or scheme relative or absolute
    var host = document.location.host; // host + port
    var protocol = document.location.protocol;
    var sr_origin = '//' + host;
    var origin = protocol + sr_origin;
    // Allow absolute or scheme relative URLs to same origin
    return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
        (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
        // or any other URL that isn't scheme relative or absolute i.e relative.
        !(/^(\/\/|http:|https:).*/.test(url));
}


//login
function login() {
user=$("#user").val();
var password=$("#password").val();
    $.ajax({
        type: "POST",
        url: window.__BASEURL__+"api/v1/account/login/",
	data: { "username": user, "password": password },
        dataType: 'json',
        success: function(response){
        showLogout(user);
        }
    });
}

//logout
function logout() {
    $.ajax({
        type: "POST",
        url: window.__BASEURL__+"api/v1/account/logout/",
        dataType: 'json',
        success: function(response){
	showLogin();
        }
        
    });
}

function showLogin() {
	$('#userForm').html('');
	var login_html='<input id="user" class="span2" type="text" placeholder="Email">'
	login_html+='<input id="password" class="span2" type="password"placeholder="Password">'
        login_html+=' <button id="loginButton" type="button" onclick=login() class="btn">Sign in</button>'
	$('#userForm').append(login_html)
}

function showLogout(user) {
	$('#userForm').html('');
	var logout_html='<font color="#FFFFFF">Hi ' + user + ' </font>'
	logout_html+='<button id="logoutButton" type="button" onclick=logout() class="btn">Sign out</button>'
	$('#userForm').append(logout_html)
	
}


 /* UTILITIES
  * ==========*/

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

//Ajax check
    
 $(function() {
	
    $.ajaxSetup({
	beforeSend: function(xhr, settings) {
        if (!csrfSafeMethod(settings.type) && sameOrigin(settings.url)) {
            // Send the token to same-origin, relative URLs only.
            // Send the token only if the method warrants CSRF protection
            // Using the CSRFToken value acquired earlier
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    },
        error: function(jqXHR, exception) {
            if (jqXHR.status === 0) {
                alert('Not connect.\n Verify Network.');
            } else if (jqXHR.status == 404) {
                alert('Requested page not found. [404]');
            } else if (jqXHR.status == 500) {
                alert('Internal Server Error [500].');
            } else if (exception === 'parsererror') {
                alert('Requested JSON parse failed.');
            } else if (exception === 'timeout') {
                alert('Time out error.');
            } else if (exception === 'abort') {
                alert('Ajax request aborted.');
            } else {
                alert('Uncaught Error.\n' + jqXHR.responseText);
            }
        }
    });
});


function getData(url) {
/*
 * Get Data in async way, so that it can return an object to a variable
 */
var data;
    $.ajax({
        async: false, //thats the trick
        url: url,
        dataType: 'json',
        success: function(response){
        data = response;
        }
        
    });
    //alert(data);
    return data;
}


function getAddress() {
/*
 * Get Address using OSM Nominatim service
 */
var lng=$("#nodeToInsertLng").val();
var lat=$("#nodeToInsertLat").val();
var url='http://nominatim.openstreetmap.org/reverse?format=json&lat='+lat+'&lon='+lng+'&zoom=18&addressdetails=1';
    $.ajax({
        async: true, //thats the trick
        url: url,
        dataType: 'json',
        success: function(response){
       data={}
       data=response;
     //  console.log(data.display_name)
       
       address=data.display_name
	$("#nodeToInsertAddress").val(address);
	$("#loadingAddress").hide();
        }
        
    });
}

$('#loading').hide(); //initially hide the loading icon
 
        $('#loading').ajaxStart(function(){
            $(this).show();
        });
        $("#loading").ajaxStop(function(){
            $(this).hide();
        });
	
function convertToSlug(Text)
{
    return Text
        .toLowerCase()
        .replace(/[^\w ]+/g,'')
        .replace(/ +/g,'-')
        ;
}
