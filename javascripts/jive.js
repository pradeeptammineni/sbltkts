$(document).ready(function () {
	
	//Get the list of SRs assigned to the current user
	var xmlDoc = ''; //XML String used for Parsing and like.
	var srNoDisc = ''; //SR Number used for Discussions.
	var miniMessage = new gadgets.MiniMessage(); //__MODULE_ID__
	var myGroups = [ ];
	var idUser, idUserSiebel= '';
	var JObject=''; //For JSON
	var totalRecords= 0;
	var viewer;
	var srNumberRefer = "";
	
 	function init() {
		registerEvents();
		viewer = opensocial.data.getDataContext().getDataSet('viewer');
	};

	function registerEvents() {
		var groupID = "@friends";
		//console.log("Selecting people for groupID '" + groupID + "'");
		osapi.people.get({
		userId : '@me',
		groupId : groupID,
		fields : 'id,name,thumbnail_url,jive_enabled'
		}).execute(function(response) {
			//console.log("Select response is " + JSON.stringify(response));
			var html = "";
			if (response.list) {
				$.each(response.list, function(index, user) {
					if (user.jive_enabled) {html += "<option value=\""+user.id+"\">" + user.displayName + "</option>";}
				});
			}
			else {
				var user = response;
				if (user.jive_enabled) { html += "<option value=\""+user.id+"\">" + user.displayName + "</option>"; }
			}
			$("#referList").html("").html(html);
		});
	};	

	//Initialize Buddy List
	init();
	
	//Get group information of current user
	osapi.groups.get({
		  userId: "@me",
		  groupId: "@self"
		}).execute(function(response) {
		  if (response.error) {
			console.log("Error " + response.error.code + " retrieving all groups: " + response.error.message);
		  }
		  else {
			$(response.list).each(function(index, group) {
			  myGroups.push(group);
			});
			// Populate the list of groups in the UI
			$(myGroups).each(function(index, group) {
			  var html = '<option class="group-item" value = "'+group.id+'"data-groupId="' + group.id + '">';
			  html += group.title;
			  html += "</option>";
			  $("#discussGroup").append(html);
			});
			$("#fetching").hide();
			$("#groups").show();
			//gadgets.window.adjustHeight();
		  }
		});
		
	osapi.jive.core.users.get({id: '@viewer'}).execute(function(response) {
		var jiveUser = response.data;
		if (!response.error) {
		idUser = jiveUser.username;
		$('#userID').text(jiveUser.name);
		idUserSiebel='JIVEUSER';//idUser.toUpperCase(); //Siebel currently allows only names in uppercase!
		var xmlInput = '<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tro="http://siebel.com/TroubleTicket" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"><soapenv:Header/><soapenv:Body><tro:GetTroubleTicket soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><SiebelMessage xsi:type="ws:ListOfWsTroubleTicketInterfaceTopElmt" xmlns:ws="http://www.siebel.com/xml/WS Trouble Ticket"><ListOfWsTroubleTicketInterface xsi:type="ws:ListOfWsTroubleTicketInterface"><TroubleTicket xsi:type="ws:ArrayOfTroubleTicket" soapenc:arrayType="ws:TroubleTicket[]"/><ws:TroubleTicket><ws:Owner>'+idUserSiebel+'</ws:Owner><ws:Status>Open</ws:Status></ws:TroubleTicket></ListOfWsTroubleTicketInterface></SiebelMessage></tro:GetTroubleTicket></soapenv:Body></soapenv:Envelope>'; // Normal XML text, not URI encoded
		osapi.jive.connects.get({
		  'alias' : 'accenture',
		  'format' : 'text',
		  'headers' : { 'Content-Type' : ['application/xml;charset=utf-8'], 'Accept-Language' : ['en-us']},
		  'params' : { 'SWEExtData' : xmlInput } // Jive Connects will URI encode values for you
		}).execute(function(response) {
				if (!response.error) {
				console.log(response.content);
				xmlDoc = response.content;
				try 
				{
					var myXML = xmlDoc;
					var xmlDoc = $.parseXML(myXML);
					var dummyParent = '';
					$myXML = $(xmlDoc);
					
					$dummyParent = $myXML.find('TroubleTicket');
					$return = $dummyParent.find('TroubleTicket');
					var srNumber, srType, pGroup, pCat, Account, Status, Desc, openDate, upDate, Disc, srDisc, ID, row, Severity = '';
					var replies = 0;
					var count = 0;
					
					$return.each(function () {

						srNumber = ($(this).children('TicketID').text());
						srType = ($(this).children('ServiceRequestType').text());
						Account = ($(this).children('Account').text());
						pGroup = ($(this).children('Area').text()); 
						pCat = ($(this).children('Sub-Area').text()); 
						Status = ($(this).children('Status').text());
						Desc = ($(this).children('Abstract').text());
						openDate = ($(this).children('OpenedDate').text());						
						upDate = ($(this).children('LastUpdated').text()); 
						Disc = ($(this).children('AgentComments').text());
						Severity = ($(this).children('Severity').text());						
						openDate = DateFormatFunc(openDate);
						upDate = DateFormatFunc(upDate);

						//If there is any special character coming from Siebel, retain it - avoid JavaScript from performing Mathematical operations and like
						for (i=0;i<=(srNumber.length-1);i++)
						{
						srNumber.charCodeAt(i);
						}
						if (upDate.search(/day/i) != -1)
						{
							upDate ='<td class="updateDays">'+upDate+'</td>'; //Image for Days ago
						}
						else if (upDate.search(/hour/i) != -1)
						{
							upDate ='<td class="updateMins">'+upDate+'</td>'; //Image for Hours ago
						}
						else
						{
							upDate ='<td class="updateMins">'+upDate+'</td>'; //Image for Minutes/Seconds ago
						}
						if (Disc=='')
						{
						srDisc = '<td class="noDiscuss"><a href="#" class="createDiscussion">Start<a></td>'; //Discussion absent image									
						}
						else
						{
						srDisc = '<td class="Discuss"><a href="'+Disc+'" target="_jiveDiscussion" class="openDiscussion">Open<a></td>'; //Discussion present image
						}

						if (Severity == '1-Critical')
						{
						Severity = '<td class="Severity1">'+Severity+'</td>';
						}
						else if (Severity == '2-High')
						{
						Severity = '<td class="Severity2">'+Severity+'</td>';
						}
						else if (Severity == '3-Medium')
						{
						Severity = '<td class="Severity3">'+Severity+'</td>';
						}
						else
						{
						Severity = '<td class="Severity4">'+Severity+'</td>';
						}
							
						row = row + 
									'<tr id="srno_' + srNumber +'_'+count+'">' +  
									'<td>' + srNumber + '</td>' + 
									'<td>' + srType + '</td>' + 
									'<td>' + Account + '</td>' + 
									'<td>' + pGroup + '</td>' + 
									'<td>' + pCat + '</td>' + 
									'<td>' + Status + '</td>' +
									'<td>' + Desc + '</td>' +
									'<td>' + openDate + '</td>' 
									+ upDate + Severity + srDisc + 
									'<td><a href="#" class="referSR">Refer</a> | <a href="#" class="viewSR">View</a> | <a href="#" class="editSR">Edit</a></td>' +
									'</tr>';	
									count++;
					});
				totalRecords = count;
				//Add the data to the table
				$("table#xmlTable tbody").append(row);
				//Sort the table - Add pages
				$("table#xmlTable").tablesorter({widthFixed: false, widgets: ['zebra'],sortList: [[8,1], [1,0]], headers: { 11:{sorter: false}}}).tablesorterPager({container: $("#pager")});
				$("#pager").show();
				$("#pagesize").val("15");
				$("#infoMsg").html("<b>The above are the SRs assigned to you.</b>");
				miniMessage.createTimerMessage(document.getElementById("infoMsg"),4);
				gadgets.window.adjustHeight();
				JObject = $.xml2json(xmlDoc); //Create JSON Object
				} catch (err) {
					$("table#xmlTable tbody").append('<tr align="center"><td colspan="12">No open SR is assigned to you.</td></tr>');
					gadgets.window.adjustHeight();
				}
				}
				else
				{
				if (response.error.message == "Connection reset")
				{ 
					window.location.reload();
				}
				else
				{
					$("#infoMsg2").html("<b>Sorry! Unable to fetch any record. Try again at a later point of time.<br/>Error:<i>"+response.error.message+"</i></b>");
					miniMessage.createTimerMessage(document.getElementById("infoMsg2"),4);
					$("table#xmlTable tbody").append('<tr align="center"><td colspan="12">Unable to fetch records now. Error: '+response.error.message+'</td></tr>');
					console.log("Error:"+response.error.message);
					gadgets.window.adjustHeight();
				}
				}	
		});
		}
		else
		{
		$("table#xmlTable tbody").append('<tr align="center"><td colspan="12">You do not seem to have corresponding account in Siebel, without which, no SR details could be fetched for you.</td></tr>');
		('#create').attr('disabled','disabled');
		gadgets.window.adjustHeight();
		}
	});
	
	//Top-Menu: SR List
	$('a.displayList').click(function(){
		$('a.create').removeClass('active');
		$(this).addClass('active');
		
		$('#createTable').hide();
		$('#xmlTable').show();
		$('table.data-grid tr').removeClass('active');
		$('#canvas').hide();
		$('#pager').show();
		$('#discussTable').hide();
		$('#ReferPage').hide();
		gadgets.window.adjustHeight();
	});
	
	//Top-Menu: CREATE SR Link
	$('a.create').live('click', function(){
		$('a.displayList').removeClass('active');
		$(this).addClass('active');
		
		$('#xmlTable').hide();
		$('#canvas').hide();
		$('#discussTable').hide();
		$('#pager').hide();
		$('#ReferPage').hide();
		$('#createHead').text("Create Service Request");
		$('#createTable').show();
		gadgets.window.adjustHeight();
	});
	
	//"View SR" link for each record
	$('a.viewSR').live('click', function(){
		var srNo = $(this).parent('td').parent('tr').children('td:first-child').text();
		var tr = $(this).closest('tr'), id = tr[0].id;
		$('table.data-grid tr').removeClass('active');
		//Highlight the selected row.
		$('table.data-grid tr#'+id).addClass('active');
		var row = $('table.data-grid tr#'+id+' td');
		
		$('#canvasHead').text("View Service Request : "+srNo);
		$('#canvas').show();
		$('#viewDisplay').show();
		$('#editDisplay').hide();
		$('#discussTable').hide();
		$('#ReferPage').hide();
		
		var i = 1;
		$(row).each(function(){
			if(i<11){
				if(i===2){$('#srType').val($(this).text()).attr('disabled','disabled')} 
				else if(i===1){$('#srNumber').text($(this).text())}
				else if(i=== 3){$('#account').val($(this).text()).attr('disabled','disabled')}
				else if(i=== 4){$('#pGroup').val($(this).text()).attr('disabled','disabled')} 
				else if(i=== 5){$('#pCat').val($(this).text()).attr('disabled','disabled')}		
				else if(i=== 6){$('#status').val($(this).text()).attr('disabled','disabled')} 
				else if(i=== 7){$('#desc').val($(this).text()).attr('disabled','disabled')}				
				else if(i=== 8){$('#creation').text($(this).text())} 
				else if(i=== 9){$('#lastUpdate').text($(this).text())} 
				else if(i=== 10){$('#severity').val($(this).text()).attr('disabled','disabled')}
			}		
			i++;
		});
		var index= id.substr(14);

		if (totalRecords == 1)
		{
			var longDescription = JObject.Body.GetTroubleTicketResponse.SiebelMessage.ListOfWsTroubleTicketInterface.TroubleTicket.TroubleTicket.Description;
			//console.log(longDescription);
		}
		else
		{
			var longDescription = JObject.Body.GetTroubleTicketResponse.SiebelMessage.ListOfWsTroubleTicketInterface.TroubleTicket.TroubleTicket[index].Description;
		}
		
		if (longDescription == "[object Object]")
		{
			$('#longDesc').val("").attr('disabled','disabled');
		}
		else
		{
			$('#longDesc').val(longDescription).attr('disabled','disabled');
		}
		gadgets.window.adjustHeight();	
	});
	
	//"Edit SR" link for each record.
	$('a.editSR').live('click', function(){
		var srNo = $(this).parent('td').parent('tr').children('td:first-child').text();
		var tr = $(this).closest('tr'), id = tr[0].id;
		$('table.data-grid tr').removeClass('active');
		$('#editDisplay').removeAttr('disabled');
		//Highlight the selected row.
		$('table.data-grid tr#'+id).addClass('active');
		var row = $('table.data-grid tr#'+id+' td');
		
		$('#canvasHead').text("Edit Service Request : "+srNo);
		$('#canvas').show();
		$('#editDisplay').show();
		$('#viewDisplay').hide();
		$('#discussTable').hide();
		$('#ReferPage').hide();
		
		var i = 1;
		$(row).each(function(){
			if(i<11){
				if(i===2){$('#srType').val($(this).text()).removeAttr('disabled')} 
				else if(i===1){$('#srNumber').text($(this).text())}
				else if(i=== 3){$('#account').val($(this).text()).removeAttr('disabled')} 
				else if(i=== 4){$('#pGroup').val($(this).text()).removeAttr('disabled')} 
				else if(i=== 5){$('#pCat').val($(this).text()).removeAttr('disabled')}				
				else if(i=== 8){$('#creation').text($(this).text())} 
				else if(i=== 9){$('#lastUpdate').text($(this).text())} 
				else if(i=== 6){$('#status').val($(this).text()).removeAttr('disabled')} 
				else if(i=== 7){$('#desc').val($(this).text()).removeAttr('disabled')}
				else if(i=== 10){$('#severity').val($(this).text()).removeAttr('disabled')}
			}		
			i++;
		});
		var index= id.substr(14);
		if (totalRecords == 1)
		{
			var longDescription = JObject.Body.GetTroubleTicketResponse.SiebelMessage.ListOfWsTroubleTicketInterface.TroubleTicket.TroubleTicket.Description;
			//console.log(longDescription);
		}
		else
		{
			var longDescription = JObject.Body.GetTroubleTicketResponse.SiebelMessage.ListOfWsTroubleTicketInterface.TroubleTicket.TroubleTicket[index].Description;
		}
		if (longDescription == "[object Object]")
		{
			$('#longDesc').val("").removeAttr('disabled');
		}
		else
		{
			$('#longDesc').val(longDescription).removeAttr('disabled');
		}	
		gadgets.window.adjustHeight();
	});
	
	//"Refer SR" link for each record
	$('a.referSR').live('click', function(){
		var srNo = $(this).parent('td').parent('tr').children('td:first-child').text();
		srNumberRefer = srNo;
		var tr = $(this).closest('tr'), id = tr[0].id;
		$('table.data-grid tr').removeClass('active');
		//Highlight the selected row.
		$('table.data-grid tr#'+id).addClass('active');
		//$('#referSub').val("About SR# "+srNo);
		$('#canvas').hide();
		$('#ReferPage').show();
		$('#createTable').hide();
		$('#discussTable').hide();
		gadgets.window.adjustHeight();
	});
	
	//"Create Discussion" link for each record - with no Discussion in Jive
	$('a.createDiscussion').live('click', function(){
		srNoDisc = ''; //Reset SR Number so that it can be used in the current context.
		srNoDisc = $(this).parent('td').parent('tr').children('td:first-child').text();
		var tr = $(this).closest('tr'), id = tr[0].id;
		$('#discussHead').text("Create Discussion on : SR#"+srNoDisc);
		if ($('#discussGroup').val() == "")
		{init(); } //Fetch group information
		$('table.data-grid tr').removeClass('active');
		$('table.data-grid tr#'+id).addClass('active');
		$('#discussTable').show();
		$('#canvas').hide();
		$('#ReferPage').hide();
		$('#viewDisplay').hide();
		$('#editDisplay').hide();
		$('#discussSRprefix').text("SR# "+srNoDisc);
		gadgets.window.adjustHeight();
	});

	//"Cancel Button" in Edit/View Modes.
	$('button#cancel').live('click', function(){
		$('#canvas').hide();
		var row = $('table.data-grid tr').removeClass('active');
		gadgets.window.adjustHeight();
	});
	
	//Submussion button for Discussion
	$('button#submitDiscussion').live('click', function(){
	var groupID = $('#discussGroup').val();
	$('#submitDiscussion').text("Processing...");
	$('#submitDiscussion').attr('disabled','disabled');
	$('#cancelDiscussion').hide();
	console.log("ID of the selected Group: "+groupID);
		osapi.jive.core.groups.get({
			//userId : "@me",
			id : groupID
			}).execute(function (response) {
				  if (response.error) {
						$("#infoMsg3").html("<b>Unable to read the groups. Make sure you are part of a group in order to post a discussion.<br/>Error:<i>"+response.error.message+"</i></b>");
						miniMessage.createTimerMessage(document.getElementById("infoMsg3"),4);
				  }
				  else {
						var targetGroup = response.data;
						var messageTitle = $('#discussSRPrefix').text()+$('#discussTopic').val();
						//var messageTitle = $('#discussTopic').val();
						var messageHTML = $('#discussMessage').val();
						var discussion = {subject: messageTitle, html: messageHTML};
						var request = targetGroup.discussions.create(discussion);
						request.execute(function(response) {
							if (response.error) {
								console.log(response.error);
								$('#submitDiscussion').text("Post Message");
								$('#submitDiscussion').removeAttr('disabled');
								$('#cancelDiscussion').show();
								$("#infoMsg4").html("<b>Unable to post discussion. Please try again.<br/>Error:<i>"+response.error.message+"</i></b>");
								miniMessage.createTimerMessage(document.getElementById("infoMsg4"),4);
							}
							else {
								srNumber = $('#discussSRprefix').text().substr(4);
								srDiscussion= response.data.resources.html.ref;								
								//console.log ("Discussion created successfully");
								UpdateRecord (srNumber,"","","","","","","","",srDiscussion);
							}
					   });
				  }
			});
			//$('#discussTable').hide();
			//var row = $('table.data-grid tr').removeClass('active');
	});

	//Cancel the Creation of Discussion	
	$('button#cancelDiscussion').live('click', function(){
		$('#discussTable').hide();
		$('#discussTopic').val("");
		$('#discussMessage').val("");
		var row = $('table.data-grid tr').removeClass('active');
		gadgets.window.adjustHeight();
	});
	
	//In View Mode -- Button to change the mode to Edit
	$('button#viewDisplay').live('click', function(){
		$('#canvasHead').text("Edit Service Request: "+$('#srNumber').text());
		$('#editDisplay').show();
		$('#viewDisplay').hide();
		$('#srType').removeAttr('disabled');
		$('#status').removeAttr('disabled');
		$('#account').removeAttr('disabled');
		$('#pGroup').removeAttr('disabled');
		$('#pCat').removeAttr('disabled');
		$('#desc').removeAttr('disabled');
		$('#severity').removeAttr('disabled');
		$('#longDesc').removeAttr('disabled');
		//$('#canvas').hide();
		//var row = $('table.data-grid tr').removeClass('active');
	});
	
	//In Edit Mode -- button to Update the SR
	$('button#editDisplay').live('click', function(){
		var srNo = $('#srNumber').text();
		var srAccount = $('#account').val();
		var srType = $('#srType').val();
		var srStatus = $('#status').val();
		var srDesc = $('#desc').val();
		var srArea = $('#pGroup').val();
		var srSubArea = $('#pCat').val();
		var srSeverity = $('#severity').val();
		var srLongDesc = $('#longDesc').val();
		$('#editDisplay').text("Processing...");
		$('#cancel').hide();
		$('#editDisplay').attr('disabled','disabled');
		UpdateRecord(srNo, srAccount, srArea, srSubArea, srType, srStatus, srSeverity, srDesc, srLongDesc, "" );
	});
	
	//Reset Button for Create
	$('button#resetCreate').live('click', function(){
		$('#srType2').val("Troubleshooting");
		$('#account2').val("Northern California Cable Company");
		$('#pGroup2').val("Desktops");
		$('#pCat2').val("Individual User Issue");
		$('#desc2').val("");
		$('#severity2').val("4-Low");
		$('#longDesc2').val("");
	});

	//Cancel button for Create -- resets the form; takes the user back to List View
	$('button#cancelCreate').live('click', function(){
		$('#srType2').val("Troubleshooting");
		$('#account2').val("Northern California Cable Company");
		$('#pGroup2').val("Desktops");
		$('#pCat2').val("Individual User Issue");
		$('#desc2').val("");
		$('#severity2').val("4-Low");
		$('#longDesc2').val("");
		$('a.create').removeClass('active');
		$('a.displayList').addClass('active');
		
		$('#createTable').hide();
		$('#xmlTable').show();
		$("#pager").show();
		gadgets.window.adjustHeight();
	});	
	
	//Submit button for Create
	$('button#submitCreate').live('click', function(){
		var srAccount = $('#account2').val();
		var srType = $('#srType2').val();
		var srDesc = $('#desc2').val();
		var srArea = $('#pGroup2').val();
		var srSubArea = $('#pCat2').val();
		var srSeverity = $('#severity2').val();
		var SRStatus = 'Open'; //Status of the SR
		var srLongDesc = $('#longDesc2').val();
		console.log("Before Create Call");
		
		//Convert to Strings (to counter presence of mathematical symbols and like!)
		srAccount = ConvertToString(srAccount);
		srType = ConvertToString(srType);
		srDesc = ConvertToString(srDesc);
		srSeverity= ConvertToString(srSeverity);
		srLongDesc = ConvertToString(srLongDesc);
		
		//Disable the Submit & Reset buttons
		$('#submitCreate').text("Processing...");
		$('#resetCreate').hide();
		$('#cancelCreate').hide();
		$('#submitCreate').attr('disabled','disabled');
		
		for (var i=0;i<=(idUserSiebel.length-1);i++)
			{
			idUserSiebel.charCodeAt(i);
			}
		console.log("Siebel USER For Create: "+idUserSiebel);
		var createXML = '<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tro="http://siebel.com/TroubleTicket" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"><soapenv:Header/><soapenv:Body><tro:CreateTroubleTicket soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><SiebelMessage xsi:type="ws:ListOfWsTroubleTicketInterfaceTopElmt" xmlns:ws="http://www.siebel.com/xml/WS Trouble Ticket"><ListOfWsTroubleTicketInterface xsi:type="ws:ListOfWsTroubleTicketInterface"><TroubleTicket xsi:type="ws:ArrayOfTroubleTicket" soapenc:arrayType="ws:TroubleTicket[]"/><ws:TroubleTicket><ws:Id>1-Test12</ws:Id>';
		if(srAccount != "" && srAccount != null)
		{
		createXML = createXML + '<ws:Account>'+srAccount+'</ws:Account>';
		}
		if(srType != "" && srType != null)
		{
		createXML = createXML + '<ws:ServiceRequestType>'+srType+'</ws:ServiceRequestType><ws:INSProduct>'+srType+'</ws:INSProduct>';
		}
		if(srArea != "" && srArea != null)
		{
		 createXML = createXML + '<ws:Area>'+srArea+'</ws:Area>';
		}
		if(srSubArea != "" && srSubArea != null)
		{
		createXML = createXML + '<ws:Sub-Area>'+srSubArea+'</ws:Sub-Area>'; 
		}
		if(idUserSiebel != "" && idUserSiebel != null)
		{
		createXML = createXML + '<ws:Owner>'+idUserSiebel+'</ws:Owner>';
		} 
		if(SRStatus != "" && SRStatus != null)
		{
		createXML = createXML + '<ws:Status>'+SRStatus+'</ws:Status>';
		}
		if(srSeverity != "" && srSeverity != null)
		{
		createXML = createXML + '<ws:Severity>'+srSeverity+'</ws:Severity>';
		}
		if(srDesc != "" && srDesc != null)
		{
		createXML = createXML + '<ws:Abstract>'+srDesc+'</ws:Abstract>';
		}
		if(srLongDesc != "" && srLongDesc != null)
		{
		createXML = createXML + '<ws:Description>'+srLongDesc+'</ws:Description>';
		}
		//Any additional attributes should be added above this line only.
		createXML = createXML + '</ws:TroubleTicket></ListOfWsTroubleTicketInterface></SiebelMessage><StatusObject xsi:type="xsd:string"></StatusObject></tro:CreateTroubleTicket></soapenv:Body></soapenv:Envelope>';
		createXML = ConvertToString(createXML);
		console.log ("The Creation XML is: "+createXML);
		osapi.jive.connects.get({
		  'alias' : 'accenture',
		  'format' : 'text',
		  'headers' : { 'Content-Type' : ['application/xml;charset=utf-8'], 'Accept-Language' : ['en-us']},
		  'params' : { 'SWEExtData' : createXML } // Jive Connects will URI encode values for you
		}).execute(function(response) {
				if (!response.error) {
				$("#infoMsg5").html("<b>SR created successfully.</b>");
				miniMessage.createTimerMessage(document.getElementById("infoMsg5"),4);
				$('#submitCreate').removeAttr('disabled');
				$('#submitCreate').text("Submit");
				$('#resetCreate').show();
				$('#cancelCreate').show();	
				$('#srType2').val("Known Error");
				$('#account2').val("Dell Corporation");
				$('#pGroup2').val("Desktop");
				$('#pCat2').val("Password Reset");
				$('#desc2').val("");
				$('#longDesc2').val("");
				$('#severity2').val("4-Low");	
				window.location.reload();
				}
				else
				{
				$("#infoMsg6").html("<b>Unable to create SR. Please try again.<br/>Error: <i>"+response.error.message+"</i></b>");
				miniMessage.createTimerMessage(document.getElementById("infoMsg6"),4);				
				//In case Submit fails, re-enable the Submit button.
				$('#submitCreate').removeAttr('disabled');
				$('#submitCreate').text("Submit");
				$('#resetCreate').show();
				$('#cancelCreate').show();				
				}
		});	
	});

	//Refer - Submit
	$('button#postMsg').live('click', function(){
			var PostID=$('#referList').val();
			var Msg = $('#referMsg').val();
			var subject = $('#referSub').val();
			var msg = new gadgets.MiniMessage();
			//console.log("Posting to:"+PostID)
	  		  var params = {
		      "userId":"@viewer",
		      "activity":{
		          "title":"Notification (Siebel SRs)",
		          "body":"{@actor} referred to {@target} about \"Service Request# "+srNumberRefer+"\"",
		          "verb":["POST"],
		          "object":{
						"id":"badge/103",
						"summary":"<b>"+subject+"</b><br/>"+Msg,
						"title":"Subject:"+subject,
						"objectType":"badge"
		          },
		          "target":{"id":"urn:jiveObject:user/"+PostID}        
		       },
		       "groupId":"@self"
		    }
			osapi.activities.create(params).execute(function(response) {
				if (!response.error) {
					$("#infoMsg10").html("<b>Notification posted successfully.</b>");
					miniMessage.createTimerMessage(document.getElementById("infoMsg10"),4);
					$('#ReferPage').hide();
					$('#referMsg').val("");
					$('#referSub').val("");
					$('table.data-grid tr').removeClass('active');
					}
				else {
					$("#infoMsg11").html("<b>Unable to post. Please try again. <br />Error: <i>"+response.error.message+"</i></b>");
					miniMessage.createTimerMessage(document.getElementById("infoMsg11"),4);
					msg.createTimerMessage("<div style='text-align:center;'> </div>", 4);
					}
				});	
	});

	//Cancel Message - Refer
	$('button#cancelMsg').live('click', function(){	
			$('#referMsg').val("");
			$('#referSub').val("");
			$('#ReferPage').hide();
			$('table.data-grid tr').removeClass('active');
			gadgets.window.adjustHeight();			
	});

	//Update the record -- invoked on click of "editDisplay" button
	function UpdateRecord (srNo, srAccount, srArea, srSubArea, srType, srStatus, srSeverity, srDesc, srLongDesc, srDiscussion){
	var updateXML = '<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tro="http://siebel.com/TroubleTicket" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"><soapenv:Header/><soapenv:Body><tro:UpdateTroubleTicket soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><SiebelMessage xsi:type="ws:ListOfWsTroubleTicketInterfaceTopElmt" xmlns:ws="http://www.siebel.com/xml/WS Trouble Ticket"><ListOfWsTroubleTicketInterface xsi:type="ws:ListOfWsTroubleTicketInterface"><TroubleTicket xsi:type="ws:ArrayOfTroubleTicket" soapenc:arrayType="ws:TroubleTicket[]"/><ws:TroubleTicket>';
	if(srNo != "" && srNo != null)
	{
	updateXML = updateXML + '<ws:TicketId>'+srNo+'</ws:TicketId>';
	}
	if(srArea != "" && srArea != null)
	{
	 updateXML = updateXML + '<ws:Area>'+srArea+'</ws:Area>';
	}
	if(srSubArea != "" && srSubArea != null)
	{
	updateXML = updateXML + '<ws:Sub-Area>'+srSubArea+'</ws:Sub-Area>'; 
	}
	if(srStatus != "" && srStatus != null)
	{
	updateXML = updateXML + '<ws:Status>'+srStatus+'</ws:Status>';
	}
	if(srSeverity != "" && srSeverity != null)
	{
	updateXML = updateXML + '<ws:Severity>'+srSeverity+'</ws:Severity>';
	}	
	if(srDesc != "" && srDesc != null)
	{
	updateXML = updateXML + '<ws:Abstract>'+srDesc+'</ws:Abstract>';
	}
	if(srLongDesc != "" && srDesc != null)
	{
	updateXML = updateXML + '<ws:Description>'+srLongDesc+'</ws:Description>';
	}
	if(srDiscussion != "" && srDiscussion != null)
	{
	updateXML = updateXML + '<ws:AgentComments>'+srDiscussion+'</ws:AgentComments>';
	}	
	updateXML = updateXML + '</ws:TroubleTicket></ListOfWsTroubleTicketInterface></SiebelMessage><StatusObject xsi:type="xsd:string"></StatusObject></tro:UpdateTroubleTicket></soapenv:Body></soapenv:Envelope>';
	console.log ("The Update XML is:"+updateXML);
	
	osapi.jive.connects.get({
	  'alias' : 'accenture',
	  'format' : 'text',
	  'headers' : { 'Content-Type' : ['application/xml;charset=utf-8'], 'Accept-Language' : ['en-us']},
	  'params' : { 'SWEExtData' : updateXML } // Jive Connects will URI encode values for you
	}).execute(function(response) {
			if (!response.error) {
			console.log(response);
			if (srDiscussion == "")
			{
			$("#infoMsg7").html("<b>SR updated successfully.</b>");
			miniMessage.createTimerMessage(document.getElementById("infoMsg7"),4);
			$('#editDisplay').text("Update");
			$('#editDisplay').removeAttr('disabled');
			$('#cancel').show();
			$('#canvas').hide();
			$('table.data-grid tr').removeClass('active');
			}
			else
			{
			
			$("#infoMsg8").html("<b>Discussion created successfully.</b>");
			miniMessage.createTimerMessage(document.getElementById("infoMsg8"),4);
			$('#discussTable').hide();
			$('#discussTopic').val("");
			$('#discussMessage').val("");
			$('#submitDiscussion').text("Post Message");
			$('#submitDiscussion').removeAttr('disabled');
			$('#cancelDiscussion').show();
			$('table.data-grid tr').removeClass('active');
			}
			//UpdateDataGrid(srNo,srAccount, srType, srStatus, srDesc, srDiscussion); //Still working on this function
			window.location.reload();
			}
			else
			{
			
			$("#infoMsg9").html("<b>Unable to process your request. Please try again.<br/>Error: <i>"+response.error.message+"</i></b>");
			miniMessage.createTimerMessage(document.getElementById("infoMsg9"),4);
			//Enable the Update Button in case the update fails
			$('#editDisplay').text("Update");
			$('#editDisplay').removeAttr('disabled');
			$('#cancel').show();
			}
	});
	}

	//Update Data Grid without actually reloading the page -- for future
	function UpdateDataGrid(srNo,srAccount, srType, srStatus, srDesc, srDiscussion)
	{
	var row = '#srno_'+srNo;
	var discussion = "";
	if(srDiscussion!= "")
	{
		discussion = '<a href="'+srDiscussion+'" target="_jiveDiscussion" class="openDiscussion">Open<a>';
	}
	
	if (srStatus != "Open")
	{
		(row).remove();
		//var row = document.getElementById('srno_'+srNo);
	}	
	else
	{
	row = $('table.data-grid tr#srno_'+srNo+' td');	
	var i = 1;
	$(row).each(function(){
			if(i<9){
				if(srType!="" && i===2){$(this).text(srType)} 
				//else if(i===1){$('#srNumber').text($(this).text())}
				else if(srAccount!=="" && i=== 3){$(this).text(srAccount)} 
				//else if(i=== 6){$('#creation').text($(this).text())} 
				else if(i=== 7){$(this).text("Just now")} 
				//else if(i=== 4){$('#status').val($(this).text()).attr('disabled','disabled')} 
				else if(srDesc!="" && i=== 5){$(this).text(srDesc)}
				else if(srDiscussion!="" && i===8){$(this).text(srDesc)}
			}		
			i++;
		});	
	}
				$("table#xmlTable").tablesorter({widthFixed: false, widgets: ['zebra'],sortList: [[6,1], [1,0]], headers: { 3:{sorter: false}, 8:{sorter: false}}}).tablesorterPager({container: $("#pager")});
				$("#pager").show();
	}
	//Create the record -- 
	function CreateRecord (srAccount, srType, srDesc){
	//Create code will be moved here once the current problem is resolved.
	}

	//Treat the strings as they are.
	function ConvertToString(theString)
	{
		for (var i=0;i<=(theString.length-1);i++)
		{
		theString.charCodeAt(i);
		}
		return (theString);
	}
	
	//Get the Discussion ID from the supplied URL
	function getDiscussionID(url)
	{
		var discussionID = '';
		var discussionID = (url.substring(url.lastIndexOf("/"))).substr(1);
		return discussionID;
	}
	
	function getReplyCount (DiscID)
	{
	var request = osapi.jive.core.discussions.get({id: DiscID});
	request.execute(function(response) { 
			console.log("Response: "+JSON.stringify(response));
			console.log("ReplyCount: "+ response.data.messages.root.replyCount);
			Count = response.data.messages.root.replyCount;
			console.log ("Reply:"+response.data.messages.root.replyCount)	
			return Count;
		});
	}

	function DateFormatFunc(InputDate)
	{
		var DtFmt = new Date(InputDate.substring(6,10),InputDate.substring(0,2)-1,InputDate.substring(3,5),InputDate.substring(11,13),InputDate.substring(14,16),InputDate.substring(17,19)).valueOf();
		var d = new Date();
		var DtCurr = new Date(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours(),d.getMinutes(),d.getSeconds()).valueOf();
		var timediff = Math.abs(DtCurr - DtFmt);
		var days = Math.floor(timediff / (1000 * 60 * 60 * 24)); 
		timediff -= days * (1000 * 60 * 60 * 24);
		var hours = Math.floor(timediff / (1000 * 60 * 60)); 
		timediff -= hours * (1000 * 60 * 60);
		hours = hours - 13; //as it is IST now. WHen there is no Daylight saving 1 should be replaced with 12.
		var mins = Math.floor(timediff / (1000 * 60)); 
		timediff -= mins * (1000 * 60);
		mins = mins - 30; //IST correction
		var secs = Math.floor(timediff / 1000); 
		timediff -= secs * 1000;
		var dtfmtDate = days +":" + hours +":"+mins +":"+secs
		if (days > 0)
		{
			if (days == 1)
			{ return "1 day ago";}
			else
			{ return days+" days ago"; }
		}
		else if (days === 0)
		{
			if (hours > 0)
			{	
				if (hours == 1)
				{return "1 hour ago";}
				else
				{return hours+" hours ago"; }
			}
			else if (mins > 0)
			{	
				if (mins == 1)
				{ return "1 min ago"; }
				else
				{return mins+" mins ago"; }
			}
			else
			{	return secs+" secs ago"; }
		}
/*		else if (hours == 0)
		{
			if (mins > 0)
			{	return mins+" mins ago"; }
			else
			{	return secs+" secs ago"; }
		}
		else
		{	return secs+" secs ago"; } */
		return (dtfmtDate);
	}
});