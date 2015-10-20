/*load database // check for tables*/
function loaddb(){
  if(db = window.openDatabase("guydb", "1.0", "GuyFieriAppData", 500000)){
    dbexists = true;
  }
  console.log('loaddb ran');
}

function checkUpdateData(){
  console.log('checkUpdateData Started');
  db.transaction(function(tx){
    tx.executeSql('SELECT lastupdate, datetime(\'now\') AS now, strftime(\'%s\',\'now\') - strftime(\'%s\',lastupdate) AS difference FROM updates LIMIT 1', [], loadUpdateData, errorUpdateData);
  });
  console.log('checkUpdateData Ended');
}

function loadUpdateData(tx, results){
  console.log('loadUpdateData Ran');
  if(results.rows.length == 1){
    if(results.rows.item(0).difference >= dbupdatewithin){
      updateUpdateData();
    } else {
    locUpdating = false;
    recUpdating = false;
    checkBlogData();
  }
  } else {
  locUpdating = false;
  recUpdating = false;
  checkBlogData();
  }
}

function errorUpdateData(err){
  db.transaction(function(tx){
    tx.executeSql('CREATE TABLE IF NOT EXISTS updates (lastupdate)', [], insertUpdateData, errorCreateUpdateTable);
  });
}

function insertUpdateData(tx, results){
  db.transaction(function(tx){
    tx.executeSql('INSERT INTO updates (lastupdate) VALUES (datetime(\'now\'))', [], successfulTimestampUpdate, errorTimestampUpdate);
  });
}

function updateUpdateData(){
  db.transaction(function(tx){
    tx.executeSql('UPDATE updates SET lastupdate=datetime(\'now\')', [], successfulTimestampUpdate, errorTimestampUpdate);
  });
}

function errorCreateUpdateTable(err){
  //navigator.notification.alert('Could not create update table: '+err, alertCallback, 'Create Update Table', 'OK');
}

function successfulTimestampUpdate(tx, results){
  //navigator.notification.alert('Successfully updated the timestamp', alertCallback, 'Update Update Timestamp', 'OK');
  deleteBlogs();
  getAppRecipeCount();
  console.log('getAppRecipeCount finished');
  console.log('getAppLocationCount called');
  getAppLocationCount();
}

function errorTimestampUpdate(err){
  //navigator.notification.alert('Could not update the update timestamp', alertCallback, 'Update Update Timestamp', 'OK');
}

//--------------START BLOG DATA FUNCTIONS----------------//
function deleteBlogs(){
  db.transaction(function(tx){
    tx.executeSql('DELETE FROM blogs', [], getAPIBlogCount, errorBlogDataCB);
  });
}

function getAPIBlogCount(tx,results){
  if(constate){
    //var uri = 'http://www.guyfieri.com/?json=1&post_type=news&include=count_total&callback=?';
    ///var uri = 'http://www.guyfieri.com/wp-json/posts?type=news&callback=?'; // good one
    ///var uri = 'http://jeremycallahan.com/gfApp/data/news.txt';
    var uri = './data/news.txt';
    
    $.getJSON(uri, function(data) {
      //console.log(data);
     //importBlogData(data['count_total']);
     importBlogData(data.length);
    });
  } else {
    checkBlogData();
  }
}

function importBlogData(count){
  //var uri = 'http://www.guyfieri.com/?json=1&post_type=news&custom_fields=news-video&count='+count+'&callback=?';
  console.log('importBlogData Starting' + count)
  ///var uri = 'http://www.guyfieri.com/wp-json/posts?type=news&callback=?'; // good one
  ///var uri = 'http://jeremycallahan.com/gfApp/data/news.txt';
  var uri = './data/news.txt';
  
  $.getJSON(uri, function(data) {
    console.log(data.length);
    $.each(data, function(index, item){
      console.log(data[index].id);
      blogsToLoad[index] = item;
      db.transaction(writeBlogData,blogerrorCB,blogsuccessCB);
    });
  });
}

function writeBlogData(tx){
  for(var i=0;i<blogsToLoad.length;i++){

    var imageAttachment = blogsToLoad[i]['featured_image']['attachment_meta']['sizes']['thumbnail']['url'];

      tx.executeSql("REPLACE INTO blogs (id, title, excerpt, content, date, url, image) VALUES (?,?,?,?,?,?,?)",[blogsToLoad[i]['ID'],blogsToLoad[i]['title'],blogsToLoad[i]['excerpt'],blogsToLoad[i]['content'],blogsToLoad[i]['date'],blogsToLoad[i]['link'],imageAttachment]);
  }
}
function blogsuccessCB() {
  blogsToLoad = [];
  checkBlogData();
}

function blogerrorCB(err) {
  blogsToLoad = [];
  checkBlogData();
}

function checkBlogData(){
  console.log('checkBlogData Started');
  db.transaction(function(tx){
    tx.executeSql('SELECT * FROM blogs ORDER BY date DESC', [], loadBlogData, errorBlogDataCB);
  });
}

function errorBlogDataCB(tx, err) {
  //navigator.notification.alert('Error loading the blog posts: '+err.message, alertCallback, 'Check Blog Data', 'OK');
  db.transaction(function(tx){
    tx.executeSql('CREATE TABLE IF NOT EXISTS blogs (id unique, title, excerpt, content, date, url, image)');
  }, createerrorCB, deleteBlogs);
}

function loadNewestBlog(){
  console.log('loadNewestBlog Started');
  db.transaction(function(tx){
    tx.executeSql('SELECT * FROM blogs ORDER BY date DESC LIMIT 1', [], loadNewestBlogData, errorNewestBlogDataCB);
  });
  console.log('loadNewestBlog Ended');
}

function loadNewestBlogData(tx, results){
  console.log('loadNewestBlogData started');
  if(results.rows.length == 1){
    var excerpt = results.rows.item(0).excerpt;
    if(excerpt.length > 125){
      excerpt = excerpt.substr(0,125)+'...';
    }
    var dateparts = results.rows.item(0).date;
    var y = dateparts.substr(0,4);
    var m = dateparts.substr(5,2);
    var d = dateparts.substr(8,2);
    var date = makeDate(y,m,d);
    var id = 'bi'+results.rows.item(0).id;
    var bs = $('#blogslide .slidecontent .item');
    bs.children('.date').html(date);
    bs.children('.title').html(results.rows.item(0).title);
    bs.children('.content').html(excerpt);
    bs.children('.readmore').children('#blomore').attr('data-id',id);
  }
  console.log('loadNewestBlogData Ended');
}

function errorNewestBlogDataCB(tx, err) {
  //navigator.notification.alert('Error loading the newest blog: '+err, alertCallback, 'Load Newest Blog', 'OK');
}

function loadBlogData(tx, results){
  console.log('loadBlogData Started');
  var listoutput = '';
  var postoutput = '';
  var len = results.rows.length;
  var oe = '';

  for (var i=0; i<len; i++){
      if(results.rows.item(i).title.length > 25){
        var title = results.rows.item(i).title.substr(0,25)+'...';
      }
      else{
        var title = results.rows.item(i).title;
      }
    var encodedTitle = encodeURIComponent(title);
    var encodedContent = encodeURIComponent($(results.rows.item(i).content).text());
    var encodedURL = encodeURIComponent(results.rows.item(i).url);
    var encodedSource = encodeURIComponent('Guy Fieri');
      var dateparts = results.rows.item(i).date;
      var y = dateparts.substr(0,4);
      var m = dateparts.substr(5,2);
      var d = dateparts.substr(8,2);
      var date = makeDate(y,m,d);
      listoutput += '<li';
      if(oe == 'odd'){
        listoutput += ' class="odd"';
        oe = '';
      }
      else{
        oe = 'odd';
      }
      listoutput += '><div class="item" rel="bi'+results.rows.item(i).id+'"><div class="title">'+title+'</div><div class="date">'+date+'</div></div></li>';
      postoutput += '<li class="item show" id="bi'+results.rows.item(i).id+'"><ul><li>';
      if(results.rows.item(i).image != '')postoutput += '<div class="imgarea"><div class="top"></div><div class="middle"><img src="'+results.rows.item(i).image+'" width="270" /></div><div class="bottom"></div></div>';
      postoutput += '<div class="date">'+date+'</div><div class="title">'+results.rows.item(i).title+'</div><div class="content">'+results.rows.item(i).content+'</div><div class="share_this"><div class="share_this_txt">Share</div><div class="share_this_icons"><a class="social_icon facebook" href="http://www.facebook.com/sharer.php?u='+encodedURL+'&t='+encodedTitle+'"></a><a class="social_icon twitter" href="https://twitter.com/intent/tweet?url='+encodedURL+'"></a><a class="social_icon linkedin" href="http://www.linkedin.com/shareArticle?mini=true&url='+encodedURL+'&title='+encodedTitle+'&source='+encodedSource+'&summary='+encodedContent+'"></a><a class="social_icon mail" href="mailto:?subject='+encodedTitle+'&body='+encodedURL+'"></a><div class="clear"></div></div><div class="clear"></div></div><div class="space130"></div></li></ul></li>';
  }
  
  $("#blogviewport #list").empty();
  $("#blogviewport #list").append(listoutput);
  if(mainblogScroll != null){
    mainblogScroll.destroy();
    mainblogScroll = null;
  }
  mainblogScroll = new iScroll('blogviewport');
  $("#blogviewport #list .item").bind('click', function(){ showblogpost($(this).attr('rel')); return false; });
  $("#blogviewport #bitems").empty();
  $("#blogviewport #bitems").append(postoutput);
  $("#blogviewport #bitems .item").css('height',($("#blogviewport").height()-48));
  $(".social_icon").bind('touchstart', function(){
    $(this).css('background-position','0 -55px');
  });
  $(".social_icon").bind('touchend', function(){
    $(this).css('background-position','0 0');
  });

    $(".social_icon").bind('click', function(e){
    e.preventDefault();
      if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Guy's Updates","Share on "+translateSocialSites($(this).attr('class').replace(/social_icon\s+/,'')),$(this).parent('.share_this_icons').parent('.share_this').siblings('.title').html(),1); }
      /* Way of implementing social icons to stay in the app when they share, the childBrowser function call doesn't work
    e.preventDefault();
    window.plugins.childBrowser.showWebPage($(this).attr('href'),{showLocationBar:true,showAddress:true,showNavigationBar:true});
      */
    window.location.href = $(this).attr('href');
    });

   blogUpdating = false;
   if(!blogUpdating && !locUpdating && !recUpdating){
       $('#updating_screen').css({'display':'none'});
    if(!constate){
        //navigator.notification.alert('Could not download updates. Turn off Airplane Mode or use Wi-Fi and then please restart the application.', function(){}, 'Guy Fieri', 'OK');
    }
   }
  console.log('loadBlogData Ended');
  loadNewestBlog();
}

function translateSocialSites(name){
   switch(name){
     case 'facebook':
       return 'Facebook';
     case 'twitter':
       return 'Twitter';
     case 'linkedin':
       return 'LinkedIn';
     case 'mail':
       return 'Mail';
   }
}

function checkdbSuccess() {
  //navigator.notification.alert('Blog data exists', alertCallback, 'Connection Status', 'OK');
}

function createerrorCB(tx, err) {
  //navigator.notification.alert('no table made'+err.message, alertCallback, 'Connection Status', 'OK');
}

function locationssuccessCBa(tx, results) {
  //navigator.notification.alert(results.insertId, alertCallback, 'inside', 'OK');
}

function locationserrorCBa(tx, err) {
  //navigator.notification.alert(err, alertCallback, 'Inside', 'OK');
}

function makeDate(y,m,d){
  var month;
  var day;
  var year = y;
  switch(m){
    case '01':
      month = 'January';
    break;
    case '02':
      month = 'February';
    break;
    case '03':
      month = 'March';
    break;
    case '04':
      month = 'April';
    break;
    case '05':
      month = 'May';
    break;
    case '06':
      month = 'June';
    break;
    case '07':
      month = 'July';
    break;
    case '08':
      month = 'August';
    break;
    case '09':
      month = 'September';
    break;
    case '10':
      month = 'October';
    break;
    case '11':
      month = 'November';
    break;
    case '12':
      month = 'December';
    break;
  }
  if(d.substr(0,1) == '0'){
    day = d.replace('0','');
  }
  else{
    day = d;
  }
  return month+' '+day+', '+year;
}
//--------------END BLOG DATA FUNCTIONS----------------//

//--------------START RECIPE DATA FUNCTIONS----------------//
function getAppRecipeCount(){
  db.transaction(function(tx){
    tx.executeSql('SELECT id FROM recipes', [], localImportRecipeData, errorRecipeDataCB);
  });
}

function localImportRecipeData(tx,results){
  currentRecipeCount = results.rows.length;
  // if(currentRecipeCount == 0){
    //var uri = 'http://www.guyfieri.com/api/customtax/get_recent_posts/?post_type=recipes&callback=?';
    //var uri = 'http://www.guyfieri.com/wp-json/posts?type=recipes';
    var uri = './data/recipe.txt';
    //var uri = 'http://www.guyfieri.com/wp-json/posts/5613/';
    $.getJSON(uri, function(data) {
    $.each(data, function(index, item){
      recipesToLoad[index] = item;
      db.transaction(writeRecipeData,recipeerrorCB,recipesuccessCB);
    });
});
  // } else {
   //  recUpdating = false;
   //  if(!blogUpdating && !locUpdating && !recUpdating){
    // $('#updating_screen').css({'display':'none'});4
    // if(!constate){
    //   //navigator.notification.alert('Could not download updates. Turn off Airplane Mode or use Wi-Fi and then please restart the application.', function(){}, 'Guy Fieri', 'OK');
    // }
   //  }
  // }
}

function writeRecipeData(tx){
  for(var i=0;i<recipesToLoad.length;i++){

    /// old: var ing = recipesToLoad[i]['terms']['recipeingredients'];

    var ing = recipesToLoad[i]['meta'][0]['value'];

    //console.log(ing);
    /* old 
    var ingList = [];    
    if(undefined !== ing){
      for(var j=0; j<ing.length; j++){
        ingList.push(ing[j].name);
      }
    }
    else {
      ingList.push("none");
    }
    */
    //console.log(ingList); 

    var occ = recipesToLoad[i]['post']['terms']['occasion'];
    console.log(occ);
    var occList = [];    
    if(undefined !== occ){
      for(var k=0; k<occ.length; k++){
        occList.push(occ[k].name);
      }
    }
    else {
      occList.push("none");
    }
    console.log(occList);

    /// old: var dish = recipesToLoad[i]['terms']['dishtype'];
    var dish = recipesToLoad[i]['post']['terms']['dishtype'];

    console.log(dish);
    var dishList = [];    
    if(undefined !== dish){
      for(var l=0; l<dish.length; l++){
        dishList.push(dish[l].name);
      }
    }
    else {
      dishList.push("none");
    }
    console.log(dishList);

    var protein = recipesToLoad[i]['post']['terms']['protein'];
    console.log(protein);
    var proteinList = [];    
    if(undefined !== protein){
      for(var m=0; m<protein.length; m++){
        proteinList.push(protein[m].name);
      }
    }
    else {
      proteinList.push("none");
    }
    console.log(dishList);

    /// old: tx.executeSql("REPLACE INTO recipes (id, title, summary, content, date, url, ingredients, image, cooktime, dish, occasion, protein) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",[recipesToLoad[i]['ID'],recipesToLoad[i]['title'],recipesToLoad[i]['excerpt'].replace(/<a\b[^>]*>(.*?)<\/a>/i,''),recipesToLoad[i]['content'],recipesToLoad[i]['date'],recipesToLoad[i]['link'],ingList,'','',dishList,occList,proteinList]);
    
    tx.executeSql("REPLACE INTO recipes (id, title, summary, content, date, url, ingredients, image, cooktime, dish, occasion, protein) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",[recipesToLoad[i]['post']['ID'],recipesToLoad[i]['post']['title'],recipesToLoad[i]['post']['excerpt'].replace(/<a\b[^>]*>(.*?)<\/a>/i,''),recipesToLoad[i]['post']['content'],recipesToLoad[i]['post']['date'],recipesToLoad[i]['post']['link'],recipesToLoad[i]['meta'][0]['value'],'','',dishList,occList,proteinList]);


  }
}

function recipesuccessCB() {
  recipesToLoad = [];
  recUpdating = false;
  if(!blogUpdating && !locUpdating && !recUpdating){
    $('#updating_screen').css({'display':'none'});
  if(!constate){
      //navigator.notification.alert('Could not download updates. Turn off Airplane Mode or use Wi-Fi and then please restart the application.', function(){}, 'Guy Fieri', 'OK');
  }
  }
}

function recipeerrorCB() {
  recipesToLoad = [];
  recUpdating = false;
  if(!blogUpdating && !locUpdating && !recUpdating){
    $('#updating_screen').css({'display':'none'});
  if(!constate){
      //navigator.notification.alert('Could not download updates. Turn off Airplane Mode or use Wi-Fi and then please restart the application.', function(){}, 'Guy Fieri', 'OK');
  }
  }
}

function checkSingleRecipeData(rid){
  db.transaction(function(tx){
  tx.executeSql('SELECT * FROM recipes WHERE id = '+rid, [], loadSingleRecipeData, errorRecipeDataCB);
  });
}

function filterRecipeData(filters){
  if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Recipes","Button Press","Filter",1); }
  var query = 'SELECT * FROM recipes WHERE';
  if(typeof filters['occ'] != 'undefined'){
    query += ' occasion LIKE \'%'+filters['occ']+'%\'';
    if(typeof filters['ing'] != 'undefined' || typeof filters['dsh'] != 'undefined'){
      query += ' AND';
  }
  }
  if(typeof filters['ing'] != 'undefined'){
    if (filters['ing'] === 'Chicken') { filters['ing'] = 'Poultry'} //Chicken is Poultry in the db
    query += ' protein LIKE \'%'+filters['ing']+'%\'';
    if(typeof filters['dsh'] != 'undefined'){
      query += ' AND';
  }
  }
  if(typeof filters['dsh'] != 'undefined'){
    query += ' dish LIKE \'%'+filters['dsh']+'%\'';
  }
  query += ' ORDER BY title ASC';
  db.transaction(function(tx){
  tx.executeSql(query, [], loadRecipeSearchData, errorRecipeSearchDataCB);
  });
}

function searchRecipeData(){
  $('#recsearchtxt').blur();
  var term = '';
  if($('#recsearchtxt').val() == 'Search Recipes' || $('#recsearchtxt').val().length < 2){
    return false;
  }
  else{
    if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Recipes","Button Press","Search",1); }
    term = $('#recsearchtxt').val();
    db.transaction(function(tx){
      tx.executeSql('SELECT * FROM recipes WHERE title LIKE \'%'+term+'%\' OR ingredients LIKE \'%'+term+'%\' OR content LIKE \'%'+term+'%\' ORDER BY title ASC', [], loadRecipeSearchData, errorRecipeSearchDataCB);
    });
  }
}

function errorRecipeSearchDataCB(){
  //navigator.notification.alert('errorRecipeSearchDataCB', alertCallback, 'Recipe Data', 'OK');
  return false;
}

function errorRecipeDataCB(err) {
  db.transaction(function(tx){
    tx.executeSql('CREATE TABLE IF NOT EXISTS recipes (id unique, title, summary, content, date, url, ingredients, image, cooktime, dish, occasion, protein)');
  }, createerrorCB, getAppRecipeCount);
}

function loadSingleRecipeData(tx, results){
  var len = results.rows.length;
  if(len == 1){
    var title = results.rows.item(0).title;
    var img = (results.rows.item(0).image != '')?'<div class="top"></div><div class="middle"><img src="'+results.rows.item(0).image+'" width="270" /></div><div class="bottom"></div>':'';
    var overviewoutput = '<div>'+((results.rows.item(0).cooktime != '' && results.rows.item(0).cooktime != null)?'<span class="content_section_title">Details</span><br /><div class="content_section">Time: '+results.rows.item(0).cooktime+'</div>':'')+((results.rows.item(0).summary != '')?'<span class="content_section_title">Overview</span><br /><div class="last_content_section">"'+results.rows.item(0).summary+'"</div>':'')+'</div>';
    var ingredientsoutput = '<div>'+((results.rows.item(0).ingredients != '')?'<span class="content_section_title">Ingredients</span><br /><div class="last_content_section">'+results.rows.item(0).ingredients+'</div>':'')+'</div>';
    var directionsoutput = '<div>'+((results.rows.item(0).content != '')?'<span class="content_section_title">Directions</span><br /><div class="last_content_section">'+results.rows.item(0).content+'</div>':'')+'</div>';
    $('#recipespage #single #ritem .item .title').html(title);
    $('#recipespage #single #ritem .item .imgarea').html(img);
    $('#recipespage #single #ritem .item #overview .content').html(overviewoutput);
    $('#recipespage #single #ritem .item #ingredients .content').html(ingredientsoutput);
    $('#recipespage #single #ritem .item #directions .content').html(directionsoutput);
    $('#recipespage #single #ritem .item .content a').attr('target','_blank');
    if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Recipes","Details > Page Load",title,1); }
    showrecipe();
  }
}

function loadRecipeSearchData(tx, results){
  var listoutput = '';
  var len = results.rows.length;
  var oe = '';
  for (var i=0; i<len; i++){
    listoutput += '<li';
    if(oe == 'odd'){
      listoutput += ' class="odd"';
      oe = '';
    }
    else{
      oe = 'odd';
    }
  listoutput += '><div class="item" rel="'+results.rows.item(i).id+'"><div class="title">';
  
  if(results.rows.item(i).title.length > 45)
    listoutput += results.rows.item(i).title.substring(0,45)+'...';
  else
    listoutput += results.rows.item(i).title;

    listoutput += '</div></div></li>';
  }
  if(len == 0){
    listoutput = '<div class="no_results_found">No Results Found</div>';
  }
  $("#recscroller #reclist").empty();
  $("#recscroller #reclist").append(listoutput);
  $("#recscroller #reclist .item").bind('click', function(){ checkSingleRecipeData($(this).attr('rel')); return false; });
  $('#recfilterbtnarea').css({'display' : 'none'});
  $('#recipefilters').css({'display' : 'none'});
  backstepRecipes.push('recipefilters');
  $('#hpbackbtn').css({'display':'block'});
  $('#listrec').css({'display' : 'block'});
  addRecipeScroll('listrec');
}
//--------------END RECIPE DATA FUNCTIONS----------------//

//--------------START LOCATION DATA FUNCTIONS----------------//
function getAppLocationCount(){
  db.transaction(function(tx){
    tx.executeSql('CREATE TABLE IF NOT EXISTS locations (id unique, title, content, url, addr1, city, state, zip, phone, lat, lng)');
    tx.executeSql('SELECT id FROM locations', [], localImportLocationData, errorLocationDataCB);
  });
}

function localImportLocationData(tx,results){
  currentLocationCount = results.rows.length;
  console.log("location count = " + currentLocationCount);
  if(currentLocationCount == 0){
    console.log('location count 0 process')
    //var uri = 'http://www.guyfieri.com/api/customtax/get_recent_posts/?post_type=hotspots&callback=?';
    /// var uri = 'http://jeremycallahan.com/gfApp/data/hotSpots.txt';
    var uri = './data/hotSpots.txt';
    //var uri = 'http://www.guyfieri.com/api/customtax/get_recent_posts/?post_type=restaurants&callback=?';
    $.getJSON(uri, function(data) {
    totalLocations = data['count_total'];
    //$.each(data['posts'], function(index, item){
    $.each(data['hotspots'], function(index, item){
      locationsToLoad[index] = item;
      //if(index == totalLocations-1){
       db.transaction(writeLocationData,locationserrorCB,locationssuccessCB);
      //}
    });
    });
  } else {
    console.log('location count > 0 process')
    locUpdating = false;
    if(!blogUpdating && !locUpdating && !recUpdating){
    $('#updating_screen').css({'display':'none'});
    if(!constate){
      //navigator.notification.alert('Could not download updates. Turn off Airplane Mode or use Wi-Fi and then please restart the application.', function(){}, 'Guy Fieri', 'OK');
    }
    }
  }
}

function writeLocationData(tx){
  for(var i=0;i<locationsToLoad.length;i++){
    // if(locationsToLoad[i]['custom_fields']['_wppl_apt'] == 'undefined' || !locationsToLoad[i]['custom_fields']['_wppl_apt']){
    //   locationsToLoad[i]['custom_fields']['_wppl_apt'] = '';
    // }
    // if(locationsToLoad[i]['custom_fields']['_wppl_lat'] == 'undefined' || !locationsToLoad[i]['custom_fields']['_wppl_lat']){
    //   locationsToLoad[i]['custom_fields']['_wppl_lat'] = '0';
    // }
    // if(locationsToLoad[i]['custom_fields']['_wppl_long'] == 'undefined' || !locationsToLoad[i]['custom_fields']['_wppl_long']){
    //   locationsToLoad[i]['custom_fields']['_wppl_long'] = '0';
    // }
    //tx.executeSql("REPLACE INTO locations (id, title, content, date, url, addr1, addr2, city, state, zip, phone, video, lat, lng) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",[locationsToLoad[i]['id'],locationsToLoad[i]['title'],locationsToLoad[i]['content'],locationsToLoad[i]['date'],locationsToLoad[i]['url'],locationsToLoad[i]['custom_fields']['_wppl_street'],locationsToLoad[i]['custom_fields']['_wppl_apt'],locationsToLoad[i]['custom_fields']['_wppl_city'],locationsToLoad[i]['custom_fields']['_wppl_state'],locationsToLoad[i]['custom_fields']['_wppl_zipcode'],locationsToLoad[i]['custom_fields']['_wppl_phone'],locationsToLoad[i]['custom_fields']['hotspot-video'],locationsToLoad[i]['custom_fields']['_wppl_lat'],locationsToLoad[i]['custom_fields']['_wppl_long']]);

    //tx.executeSql('DROP TABLE locations');

    //console.log(locationsToLoad[i]['hotspot']['title']);
    tx.executeSql("REPLACE INTO locations (id, title, content, url, addr1, city, state, zip, phone, lat, lng) VALUES (?,?,?,?,?,?,?,?,?,?,?)",[locationsToLoad[i]['hotspot']['id'],locationsToLoad[i]['hotspot']['title'],locationsToLoad[i]['hotspot']['description'],locationsToLoad[i]['hotspot']['page_url'],locationsToLoad[i]['hotspot']['street'],locationsToLoad[i]['hotspot']['city'],locationsToLoad[i]['hotspot']['province'],locationsToLoad[i]['hotspot']['postal_code'],locationsToLoad[i]['hotspot']['phone'],locationsToLoad[i]['hotspot']['latitude'],locationsToLoad[i]['hotspot']['longitude']]);
  }
}

function locationssuccessCB() {
  locationsToLoad = [];
  locUpdating = false;
  if(!blogUpdating && !locUpdating && !recUpdating){
    $('#updating_screen').css({'display':'none'});
  if(!constate){
      //navigator.notification.alert('Could not download updates. Turn off Airplane Mode or use Wi-Fi and then please restart the application.', function(){}, 'Guy Fieri', 'OK');
  }
  }
}

function locationserrorCB() {
  locationsToLoad = [];
  locUpdating = false;
  if(!blogUpdating && !locUpdating && !recUpdating){
    $('#updating_screen').css({'display':'none'});
  if(!constate){
      //navigator.notification.alert('Could not download updates. Turn off Airplane Mode or use Wi-Fi and then please restart the application.', function(){}, 'Guy Fieri', 'OK');
  }
  }
}

function checkSingleLocationData(lid){
  db.transaction(function(tx){
  tx.executeSql('SELECT * FROM locations WHERE id = '+lid, [], loadSingleLocationData, errorLocationDataCB);
  });
}

function checkLocationData(){
  db.transaction(function(tx){
    tx.executeSql('SELECT * FROM locations ORDER BY title ASC', [], loadLocationData, errorLocationDataCB);
  });
}

function searchLocationData(){
  if($('#locsearchtxt').val() != ''){
    $('#locationsloader').css({'display':'block'});
    if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Locations","Button Press","Search",1); }
      console.log('searchLocationData function ran');
      db.transaction(function(tx){
        tx.executeSql('SELECT * FROM locations ORDER BY title ASC', [], getLatLng, errorLocationDataCB);
      });
    $('#locsearchtxt').blur();
  } 
  else {
    //navigator.notification.alert('You must fill out a search keyword.', alertCallback, 'Location Search Error', 'OK');
  }
}

function errorLocationSearchDataCB(){
  return false;
}

//id, title, content, url, addr1, city, state, zip, phone, lat, lng

function errorLocationDataCB(err) {
  console.log('errorLocationDataCB');
  db.transaction(function(tx){
    //tx.executeSql('CREATE TABLE locations (id unique, title, content, url, addr1, city, state, zip, phone, lat, lng)');
    tx.executeSql('CREATE TABLE IF NOT EXISTS locations (id unique, title, content, url, addr1, city, state, zip, phone, lat, lng)');
  }, createerrorCB, getAppLocationCount);
}

function loadSingleLocationData(tx, results){
  var len = results.rows.length;
  if(len == 1){
    var title = results.rows.item(0).title;
    var phone = results.rows.item(0).phone;
    //phone = phone.replace('-','');
  var daddr = ((results.rows.item(0).addr1!='')?results.rows.item(0).addr1:'')+((results.rows.item(0).addr2!='')?'+'+results.rows.item(0).addr2:'')+((results.rows.item(0).city!='')?'+'+results.rows.item(0).city:'')+((results.rows.item(0).state!='')?'+'+results.rows.item(0).state:'')+((results.rows.item(0).zip!='')?'+'+results.rows.item(0).zip:'');
  daddr = daddr.replace(' ','+');
    //var img = (results.rows.item(0).image != '')?'<div class="top"></div><div class="middle"><img src="'+results.rows.item(0).image+'" width="270" /></div><div class="bottom"></div>':'';
    var output = '<div>';
    var addressoutput = '';
    addressoutput += ((results.rows.item(0).addr1 != '')?results.rows.item(0).addr1:'');
    addressoutput += ((results.rows.item(0).addr2 != '')?((results.rows.item(0).addr1 != '')?', ':'')+results.rows.item(0).addr2:'');
    addressoutput += ((results.rows.item(0).city != '')?((results.rows.item(0).addr1 != ''||results.rows.item(0).addr2 != '')?'<br />':'')+results.rows.item(0).city:'');
    addressoutput += ((results.rows.item(0).state != '')?((results.rows.item(0).city != '')?', ':((results.rows.item(0).addr1 != ''||results.rows.item(0).addr2 != '')?'<br />':''))+results.rows.item(0).state:'');
    addressoutput += ((results.rows.item(0).zip != '')?((results.rows.item(0).state != ''||results.rows.item(0).city != '')?' ':((results.rows.item(0).addr1 != ''||results.rows.item(0).addr2 != '')?'<br />':''))+results.rows.item(0).zip:'');
    output += ((addressoutput != '')?'<span class="content_section_title">Address</span><br /><div class="content_section">'+addressoutput+'</div>':'');
    output += ((results.rows.item(0).content != '')?'<span class="content_section_title">Overview</span><br /><div class="content_section">'+results.rows.item(0).content+'</div>':'');
    output += ((phone != '')?'<a class="loc_a phone_a" href="tel:'+phone+'">Call<img class="arrow_right" src="img/locations/arrow_right.png" width="19" height="18" /></a>':'');
    output += ((results.rows.item(0).lat != ''&&results.rows.item(0).lng != '')?((phone != '')?'<br />':'')+'<a class="loc_a directions_a" href="http://maps.google.com/maps?saddr='+storage.getItem('lat')+','+storage.getItem('lng')+'&daddr='+daddr+'" target="_blank">Get Directions<img class="arrow_right" src="img/locations/arrow_right.png" width="19" height="18" /></a>':'');
    output += '</div>';
    $('#locationspage #single #litem .item .title').html(title);
    //$('#locationspage #single #litem .item .imgarea').html(img);
    $('#locationspage #single #litem .item .content').html(output);
    $('#locationspage #single #litem .item .content a').each(function(){
    if(!$(this).hasClass('loc_a')){
      $(this).attr('target','_blank');
    }
  });
    $('#locationspage #single #litem .item .content .phone_a').bind('click',function(e){ e.preventDefault(); if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,'Locations','Restaurant Details > Call',title,1); } window.location.href = $(this).attr('href'); });
    $('#locationspage #single #litem .item .content .directions_a').bind('click',function(e){ e.preventDefault(); if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,'Locations','Restaurant Details > Get Directions',title,1); } window.open($(this).attr('href'), '_blank', 'location=yes'); });
    if(gaPluginInitialized){ gaPlugin.trackPage(GATrackPageResultHandler,GATrackPageErrorHandler,'Locations - Details Page: '+title); }
    showlocation();
  }
  else
    alert('No results');
}

function loadLocationData(tx, results){
  clearMarkers();
  var dist;
  var myIcon = new google.maps.MarkerImage("img/locations/markers/blue.png", null, null, null, new google.maps.Size(31,52));
  var infoboxoptions = {
                        boxStyle:{
                                  background:"#000 url('img/locations/infobox_bg.jpg') repeat-x",
                                  border:"1px solid #FFF",
                                  color:"#FFF",
                                  font:"14px Museo700",
                                  position:"relative"
                        },
            closeBoxURL: "",
                        pane: "floatPane",
                        pixelOffset:new google.maps.Size(0,-95)
  };
  var infobox = new InfoBox(infoboxoptions);
  var latlng = '';
  var listoutput = new Array();
  var postoutput = '';
  var len = results.rows.length;
  var infobox_click = 0;
  for (var i=0; i<len; i++){
    dist = new Number(distance(storage.getItem('lat'), storage.getItem('lng'), results.rows.item(i).lat, results.rows.item(i).lng));
    if(dist < 100){
    var distInt = Math.round(dist*1000);
      latlng = new google.maps.LatLng(results.rows.item(i).lat,results.rows.item(i).lng);
      var marker = new google.maps.Marker({
        position: latlng,
        map: map,
        title:results.rows.item(i).title,
        zIndex: results.rows.item(i).id,
        optimized: 0,
        icon: myIcon
      });
      google.maps.event.addListener(marker, 'click', function(){
        if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,'Locations','Map View > Marker Click',this.title,1); }
        var content = '<div class="info_box_title" rel="'+this.zIndex+'"><div><span class="title">'+this.title+'</span><img class="arrow_right" src="img/locations/arrow_right.png" width="19px" height="18px" /></div></div>';
        /* If you would like to set it center, here is the code the mostly does it... it does it on a second click, i assume because the info_box_title element already lives in the map... Adding to #locationshdr currently because I didn't know where was best
        $("#locationshdr").append(content);
        var width = $('.info_box_title').outerWidth();
        width = width/2 * -1;
        infoboxoptions.pixelOffset = new google.maps.Size(width,-95);
        infobox.setOptions(infoboxoptions);
        $(".info_box_title").remove();
        */
        infobox.setContent(content);
        infobox.open(map, this);
    
    /* Click event works now, but somehow checkSingleLocationData is not being called or may be that function has some issues - Added by Arun on Aug 29th.
        */
    if(infobox_click == 0){
      google.maps.event.addListener(infobox, 'domready', function(){
        $('.info_box_title').on('click', function(){
                if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,'Locations','Map View > Restaurant Details',$(this).children('div').children('.title').html(),1); }
        checkSingleLocationData($(this).attr('rel'));
        });
      });
      infobox_click = 1;
    }
    
        infobox.show();
      });
      markers.push(marker);
    if(typeof listoutput[distInt] == 'undefined'){
      listoutput[distInt] = '';
    }
      listoutput[distInt] += '<li class="item" rel="'+results.rows.item(i).id+'"><div class="title">';
  
  if(results.rows.item(i).title.length > 25)
    listoutput[distInt] += results.rows.item(i).title.substring(0,25)+'...';
  else
    listoutput[distInt] += results.rows.item(i).title;
    
  listoutput[distInt] += '</div><div class="address">';
  
      if(results.rows.item(i).addr1){
        if(results.rows.item(i).addr1.length > 25)
      listoutput[distInt] += results.rows.item(i).addr1.substring(0,25)+'...';
    else
      listoutput[distInt] += results.rows.item(i).addr1;
      }
      if(results.rows.item(i).city && results.rows.item(i).state){
        listoutput[distInt] += '<br />'+results.rows.item(i).city+', '+results.rows.item(i).state;
      } else if(results.rows.item(i).city) {
        listoutput[distInt] += '<br />'+results.rows.item(i).city;
      } else if(results.rows.item(i).state) {
        listoutput[distInt] += '<br />'+results.rows.item(i).state;
      }
      listoutput[distInt] += '</div></li>';
    }
  }
  $("#listloc #loclist").empty();
  $("#listloc #loclist").append(listoutput.join(''));
  addLocationScroll('listloc');
  $("#listloc .item").bind('click', function(){
    if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,'Locations','List View > Restaurant Details',$(this).children('div').children('.title').html(),1); }
    checkSingleLocationData($(this).attr('rel')); 
    return false;
  });
}

function loadLocationSearchData(searchLatLng, tx, results){
  console.log('11111');
  locationsSearchDone = true;
  clearMarkers();
  
  google.maps.event.addListenerOnce(map, 'tilesloaded', function(){
    console.log('22222');
    $('#locationsloader').css({'display':'none'});
    var searchLat = searchLatLng.lat();
    console.log(searchLat);
    var searchLng = searchLatLng.lng();
    console.log(searchLng);
    var dist;
    var searchLocationIcon = new google.maps.MarkerImage("img/locations/markers/red.png", null, null, null, new google.maps.Size(31,52));

    console.log('33333');
    console.log(searchLocationIcon);

    var myIcon = new google.maps.MarkerImage("img/locations/markers/blue.png", null, null, null, new google.maps.Size(31,52));
    var infoboxoptions = {
              boxStyle:{
                    background:"#000 url('img/locations/infobox_bg.jpg') repeat-x",
                    border:"1px solid #FFF",
                    color:"#FFF",
                    font:"14px Museo700",
                    position:"relative"
              },
              closeBoxURL: "",
              pane: "floatPane",
              pixelOffset:new google.maps.Size(0,-95)
    };

    console.log('44444');
    console.log(myIcon);

    var infobox = new InfoBox(infoboxoptions);
    var latlng = '';
    var listoutput = new Array();
    var postoutput = '';
    var len = results.rows.length;

    console.log('55555');
    console.log(len);

    var infobox_click = 0;
    for (var i=0; i<len; i++){
        dist = new Number(distance(searchLat, searchLng, results.rows.item(i).lat, results.rows.item(i).lng));
        
        console.log('66666');
        console.log(dist);

        //if(dist < 100){
            var distInt = Math.round(dist*1000);
            latlng = new google.maps.LatLng(results.rows.item(i).lat,results.rows.item(i).lng);
            
            var marker = new google.maps.Marker({
                position: latlng,
                map: map,
                title:results.rows.item(i).title,
                zIndex: results.rows.item(i).id,
                optimized: 0,
                icon: myIcon
            });

            console.log('7777777');

            google.maps.event.addListener(marker, 'click', function(){
                if(gaPluginInitialized){ 
                  gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,'Locations','Map View > Marker Click',this.title,1); 
                  console.log('88888');
                  console.log(this.title);
                }

                var content = '<div class="info_box_title" rel="'+this.zIndex+'"><div><span class="title">'+this.title+'</span><img class="arrow_right" src="img/locations/arrow_right.png" width="19px" height="18px" /></div></div>';

                infobox.setContent(content);
                infobox.open(map, this);
                
                if(infobox_click == 0){ 
                  console.log('99999');

                  google.maps.event.addListener(infobox, 'domready', function(){
                      $('.info_box_title').bind('click', function(){
                          if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,'Locations','Map View > Restaurant Details',$(this).children('div').children('.title').html(),1); }
                           checkSingleLocationData($(this).attr('rel'));
                      });
                  });
                  infobox_click = 1;
                }
                infobox.show();
            });

            markers.push(marker);

            if(typeof listoutput[distInt] == 'undefined'){
               listoutput[distInt] = '';
               console.log('aaaaa');
            }

            listoutput[distInt] += '<li class="item" rel="'+results.rows.item(i).id+'"><div class="title">';
        
            if(results.rows.item(i).title.length > 25){
               listoutput[distInt] += results.rows.item(i).title.substring(0,25)+'...';
               console.log('bbbbb');
            }
            else {
                listoutput[distInt] += results.rows.item(i).title;
                console.log('ccccc');
            }

            listoutput[distInt] += '</div><div class="address">';
        
            if(results.rows.item(i).addr1){
                console.log('ddddd');

              if(results.rows.item(i).addr1.length > 25){
                listoutput[distInt] += results.rows.item(i).addr1.substring(0,25)+'...';
                console.log('eeeee');
              }  
              else {
                listoutput[distInt] += results.rows.item(i).addr1;
                console.log('ggggg');
              }
            }

            if(results.rows.item(i).city && results.rows.item(i).state){
               listoutput[distInt] += '<br />'+results.rows.item(i).city+', '+results.rows.item(i).state;
               console.log('hhhhh');
            } 
            else if(results.rows.item(i).city) {
               listoutput[distInt] += '<br />'+results.rows.item(i).city;
               console.log('iiiii');
            } 
            else if(results.rows.item(i).state) {
               listoutput[distInt] += '<br />'+results.rows.item(i).state;
               console.log('jjjjj');
            }
          listoutput[distInt] += '</div></li>';
        //}
    }

    var marker = new google.maps.Marker({
        position: searchLatLng,
        map: map,
        title:$('#locsearchtxt').val(),
        optimized: 0,
        icon: searchLocationIcon
    });
    console.log('kkkkk');

    google.maps.event.addListener(marker, 'click', function(){
        var content = '<div class="info_box_title_no_arrow"><div>'+this.title+'</div></div>';
        infobox.setContent(content);
        infobox.open(map, this);
        infobox.show();
        console.log('lllll');
    });

    $("#listloc #loclist").empty();
    $("#listloc #loclist").append(listoutput.join(''));
    
    addLocationScroll('listloc');
    
    $("#listloc .item").bind('click', function(){
        if(gaPluginInitialized){ 
            gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,'Locations','List View > Restaurant Details',$(this).children('div').children('.title').html(),1); 
        }
        checkSingleLocationData($(this).attr('rel')); 
        return false;
        console.log('mmmmm');
    });
  
  });
  
  map.setZoom(8);
  map.setCenter(searchLatLng);
  console.log('nnnnn');
}

function clearMarkers(){
  while(markers[0]){
    var marker = markers.pop();
      google.maps.event.clearInstanceListeners(marker);
      marker.setMap(null);
      marker = null;
  }
}
function getLatLng(tx,results){
  var address = $('#locsearchtxt').val();
  var geocoder = new google.maps.Geocoder();
  geocoder.geocode({'address': address}, function(geocodeResults, status){
    loadLocationSearchData(geocodeResults[0]['geometry']['location'],tx,results);
  });
}
//--------------END LOCATION DATA FUNCTIONS----------------//