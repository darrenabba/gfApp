  function onLoad() {
    document.addEventListener("deviceready", onDeviceReady, false);
  }
  
  function onUnload() {
	gaPlugin.exit(GAExitResultHandler,GAExitErrorHandler);
  }

  var platform = '';

  var internalclick = false;
  var mainnavclicked = false;
  var backstepLocations = [];
  var backstepRecipes = [];
  var backstepBlogs = [];
  
  var gaPlugin;
  var gaPluginInitialized;

  var map = false;
  var mapstate = map;
  var markers = [];
  var base = null;
  var current = null;
  var currentPage = 'homepage';
  var constate = false;
  var db;
  var dbexists = false;
  var dbupdatewithin = 86400;
  var storage = window.localStorage;
  var totalBlogs = 0;
  var currentBlogCount = 0;
  var totalLocations = 0;
  var currentLocationCount = 0;
  var totalRecipes = 0;
  var currentRecipeCount = 0;
  var locationsSearchDone = false;
  var blogsToLoad = new Array();
  var recipesToLoad = new Array();
  var locationsToLoad = new Array();

  var rcpfilters = [];

  var hpslideScroll = null;
  var mainblogScroll = null;
  var blogScroll = null;
  var recipeListScroll = null;
  var recipeScroll = null;
  var locationScroll = null;
  
  var wasTouched = false;
  var didMove = false;
  
  var blogUpdating = true;
  var locUpdating = true;
  var recUpdating = true;

  function onDeviceReady(){
    gaPlugin = window.plugins.gaPlugin;
    gaPlugin.init(GASuccessHandler, GAErrorHandler, "UA-37376566-2", 10);
    platform = device.platform;
    setRecipeBtnHack(platform);
    loaddb();
    checkConnection(true);
  }
  
  function GASuccessHandler(){
    gaPluginInitialized = true;
    gaPlugin.trackPage(GATrackPageResultHandler,GATrackPageErrorHandler,'Home');
    //navigator.notification.alert('Success', alertCallback, 'GASuccessHandler', 'OK');
  }
  
  function GAErrorHandler(){
    gaPluginInitialized = false;
    //navigator.notification.alert('Error', alertCallback, 'GAErrorHandler', 'OK');
  }
  
  function GATrackEventResultHandler(result){
    //navigator.notification.alert('Result: '+result, alertCallback, 'GATrackEventSuccessHandler', 'OK');
  }
  
  function GATrackEventErrorHandler(error){
    //navigator.notification.alert('Error: '+error, alertCallback, 'GATrackEventErrorHandler', 'OK');
  }

  function GATrackPageResultHandler(result){
    //navigator.notification.alert('Result: '+result, alertCallback, 'GATrackPageSuccessHandler', 'OK');
  }
  
  function GATrackPageErrorHandler(error){
    //navigator.notification.alert('Error: '+error, alertCallback, 'GATrackPageErrorHandler', 'OK');
  }
  
  function GAExitResultHandler(result){
    //navigator.notification.alert('Result: '+result, alertCallback, 'GAExitResultHandler', 'OK');
  }
  
  function GAExitErrorHandler(error){
    //navigator.notification.alert('Error: '+error, alertCallback, 'GAExitErrorHandler', 'OK');
  }

  document.body.addEventListener('touchmove', function(event) {
    event.preventDefault();
    if(wasTouched){
      didMove = true;
    }
  }, false);

  $(document).ready(function(){
    $('#updating_screen div, #blogpage, #recipespage, #locationspage, #locationslide, #recipeslide, #blogslide').css('background-size',$('body').width()+'px '+$('body').height()+'px');
    $('#hpbackbtn').click(function(){
	  $(this).attr('rel',$('#main div.page.pageview').attr('id'));
	  switch($('#main div.page.pageview').attr('id')){
        case 'blogpage':
		  if(backstepBlogs[(backstepBlogs.length-1)] == ''){ internalclick = true; };
		  break;
		case 'recipespage':
		  if(backstepRecipes[(backstepRecipes.length-1)] == 'recipefilters'||backstepRecipes[(backstepRecipes.length-1)] == 'list'){ internalclick = true; };
		  break;
		case 'locationspage':
		  if(backstepLocations[(backstepLocations.length-1)] == 'map'||backstepLocations[(backstepLocations.length-1)] == 'list'){ internalclick = true; };
		  break;
	  }
      menuclicks($(this).attr('id'));
      return false;
    });
	
	$('footer a').bind('touchstart',function(){
		$(this).addClass('on');
	});
	$('footer a').bind('touchend',function(){
        if($(this).attr('rel') != currentPage){
			$(this).removeClass('on');
		}
	});
    $('footer a').click(function(){ mainnavclicked = true; menuclicks($(this).attr('id')); return false; });
    $('#hpsliderspot a, #hpsliderspot .calltoaction').click(function(){ if(gaPluginInitialized){ var pageName = translatePageNames($(this).attr('rel'),"Home"); gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Home","Button Press",pageName,1); } menuclicks($(this).attr('id')); return false; });
    
    $('#hpsliderspot ul').css({'height' : $('body').height(), 'width' : $('body').width()});
    $('#hpsliderspot ul li').css({'height' : $('body').height(), 'width' : $('body').width()});
    $('#hpsliderspot .slidecontent').css('padding-top',$('header').height());
    new Swipe(document.getElementById('hpsliderspot'));
    $('#dotswrapper').css('top',((($('body').height()-($('header').height()+$('#hpsliderspot ul li .slidecontent').height()+$('footer').height()))/2)-7)+($('header').height()+$('#hpsliderspot ul li .slidecontent').height()));
    $('#blogviewport').css('height',($('body').height()-($('header').height()+$('footer').height()))+30);
    $('#lili').css('height',($('body').height()-($('header').height()+$('footer').height()))+15);
    $('#rili').css('height',($('body').height()-($('header').height()+$('footer').height()+$('#recipespage #single #btns').height())));
    $('#blogviewport #btns .prev').bind('click', function(){ prevBlog(); });
    $('#blogviewport #btns .next').bind('click', function(){ nextBlog(); });

    $('#locationspage').css('background-size',$('body').width()+'px '+$('body').height()+'px');
    $('#recipespage').css('background-size',$('body').width()+'px '+$('body').height()+'px');
    $('#recipefilters').css('height',($('body').height()-($('header').height()+$('footer').height())+100)+30);
    addRecipeScroll('recipefilters');
  });

  function menuclicks(id){
    var where = $('#'+id).attr('rel');
    if(internalclick){
      if(where == 'blogpage'){
        $("#blogviewport #list .item").unbind('touchstart');
        $("#blogviewport #list .item").unbind('touchend');
		$('#hpbackbtn').css({'display':'none'});
        $('header #pagetitle').css({'background-image':'url(img/blog/blog_hdr.png)','background-size':'174px 19px'});
        $('#blogviewport #singles').css('display','none');
        $('#blogviewport #list .item').bind('touchstart', function(){
          wasTouched = true;
        });
        $('#blogviewport #list .item').bind('touchend', function(){ 
          if(didMove){
            didMove = false;
          }
          else{
            if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Guy's Updates","Page Load",$(this).children('.title').html(),1); }
            showblogpost($(this).attr('rel'));
          }
          wasTouched = false;
          //return false;
        });
        $('#blogviewport #list').css('display','block');
		backstepBlogs.pop();
      }
      else if(where == 'recipespage'){
		if(backstepRecipes[(backstepRecipes.length-1)] == 'recipefilters'){
		  $('#hpbackbtn').css({'display':'none'});
          $('#recscroller #reclist .item').unbind('click');
          $('#recipespage #listrec').css('display','none');
          $('#recipefilters').css({'display' : 'block'});
          $('#recfilterbtnarea').css({'display' : 'block'});
	      addRecipeScroll('recipefilters');
		} else if(backstepRecipes[(backstepRecipes.length-1)] == 'list'){
          $('#recipespage #single #btns .overviewbtn').unbind('click');
          $('#recipespage #single #btns .ingredientsbtn').unbind('click');
          $('#recipespage #single #btns .directionsbtn').unbind('click');
          $('#recipespage #single').css('display','none');
          $('#recscroller #reclist .item').bind('click', function(){ checkSingleRecipeData($(this).attr('rel')); return false; });
          $('#recipespage #listrec').css('display','block');
          addRecipeScroll('listrec');
		}
		backstepRecipes.pop();
      }
      else if(where == 'locationspage'){
		$('#hpbackbtn').css({'display':'none'});
        $('#switchbtn').unbind('mousedown').mousedown(switchButtonMouseDown);
        $('#locationspage #single').css('display','none');
		if(backstepLocations[(backstepLocations.length-1)] == 'map'){
          $('#locationshdr, #locationspage #map_canvas').css('display','block');
          addLocationScroll('');
		} else if(backstepLocations[(backstepLocations.length-1)] == 'list'){
          $('#locationshdr, #locationspage #listloc').css('display','block');
          $("#listloc .item").bind('click', function(){ 
            if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,'Locations','List View > Restaurant Details',$(this).children('.title').html(),1); }
            checkSingleLocationData($(this).attr('rel'));
            return false;
          });
          addLocationScroll('listloc');
		}
		backstepLocations.pop();
      }
      internalclick = false;
    }
    else{
	  var pageName = translatePageNames(where,"Main Navigation");
	  if(where != currentPage){
	    switch(currentPage){
		  case 'blogpage':
		    releaseBlogsPage();
			break;
		  case 'recipespage':
		    releaseRecipesPage();
			break;
		  case 'locationspage':
		    releaseLocationsPage();
			break;
	    }
        $('footer a.on').removeClass('on');
        $('#main div.page').removeClass('pageview');
	  }

      switch(where){
        case 'homepage':
          $('#homebtn').addClass('on');
          $('#'+where).addClass('pageview');
          $('header #pagetitle').css({'background-image':'url(img/header/logo.png)','background-size':'60px 38px'});
          $('#hpbackbtn').css({'display':'none'});
	  $('header #pagetitle').unbind('click');
	  currentPage = 'homepage';
          if(mainnavclicked){ mainnavclicked = false; if(gaPluginInitialized){ gaPlugin.trackPage(GATrackPageResultHandler,GATrackPageErrorHandler,'Home'); } }
          loadNewestBlog();
        break;
        case 'blogpage':
	      if(where == currentPage){
                    if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Blogs","Main Navigation > Button Press","Reset",1); }
		    resetBlogsPage(id);
		  } else {
			  		if(mainnavclicked){ mainnavclicked = false; if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Main Navigation","Button Press",pageName,1); } }
                    if(gaPluginInitialized){ gaPlugin.trackPage(GATrackPageResultHandler,GATrackPageErrorHandler,'Guy\'s Updates'); }
		    viewBlogsPage(id,where);
		  }
        break;
        case 'recipespage':
	      if(where == currentPage){
                    if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Recipes","Main Navigation > Button Press","Reset",1); }
		    resetRecipesPage(id);
		  } else {
			  		if(mainnavclicked){ mainnavclicked = false; if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Main Navigation","Button Press",pageName,1); } }
                    if(gaPluginInitialized){ gaPlugin.trackPage(GATrackPageResultHandler,GATrackPageErrorHandler,'Recipes'); }
		    viewRecipesPage(id,where);
		  }
        break;
        case 'locationspage':
	      if(where == currentPage){
                    if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Locations","Main Navigation > Button Press","Reset",1); }
		    resetLocationsPage(id);
		  } else {
			  		if(mainnavclicked){ mainnavclicked = false; if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Main Navigation","Button Press",pageName,1); } }
                    if(gaPluginInitialized){ gaPlugin.trackPage(GATrackPageResultHandler,GATrackPageErrorHandler,'Locations'); }
		    viewLocationsPage(id,where,'navigate');
		  }
        break;
      }

    }
  }
  
  /* Locations Page */
  
  function addLocationScroll(id){
    if(locationScroll != null){
	  locationScroll.destroy();
	  locationScroll = null;
    }
	if(id != ''){
      locationScroll = new iScroll(id);
	}
  }
  
  function switchButtonMouseDown(){
    if($(this).hasClass('map')){
	  if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Locations","Button Press","List View",1); }
      $('#map_canvas').css('display','none');
      $('#listloc').css('display','block');
      $("#listloc .item").bind('click', function(){
        if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,'Locations','List View > Restaurant Details',$(this).children('.title').html(),1); }
        checkSingleLocationData($(this).attr('rel'));
        return false;
      });
      $(this).removeClass('map');
      addLocationScroll('listloc');
    } else {
	  if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Locations","Button Press","Map View",1); }
      $("#listloc .item").unbind('click');
      $('#map_canvas').css('display','block');
      $('#listloc').css('display','none');
      $(this).addClass('map');
      addLocationScroll('');
    }
  }
  
  function viewLocationsPage(id,where,type){
    $('#locationsbtn').addClass('on');
    $('#'+where).addClass('pageview');
    $('header #pagetitle').css({'background-image':'url(img/locations/locations_title.png)','background-size':'137px 15px'});
	$('header #pagetitle').unbind('click').bind('click',function(){
	  if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Locations","Header > Button Press","Reset",1); }
	  resetLocationsPage($(this).attr('id'));
	});
	if(backstepLocations.length == 0){
      $('#hpbackbtn').css({'display':'none'});
      $('#listloc').css('height',($('body').height()-($('header').height()+$('footer').height())+100)+30);
      $('#switchbtn').unbind('mousedown').mousedown(switchButtonMouseDown);
      if(!$('#switchbtn').hasClass('map')){
        $("#listloc .item").bind('click', function(){
          if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,'Locations','List View > Restaurant Details',$(this).children('.title').html(),1); }
          checkSingleLocationData($(this).attr('rel'));
          return false;
        });
	  } else if(type == 'reset' || !locationsSearchDone){
		checkConnection(false);
        relocate(true);
	  }
	} else {
      $('#hpbackbtn').css({'display':'block'});
	}
	currentPage = 'locationspage';
  }
  
  function releaseLocationsPage(){
	if(backstepLocations.length == 0){
	  $('#switchbtn').unbind('mousedown');
      if(!$('#switchbtn').hasClass('map')){
        $("#listloc .item").unbind('click');
	  }
	}
  }
  
  function resetLocationsPage(id){
    $('#locsearchtxt').val('City, ST or Zip');
    $('#listloc .item').unbind('click');
	$('#switchbtn').addClass('map');
    $('#locationshdr, #map_canvas').css('display','block');
    $('#listloc').css('display','none');
	backstepLocations = [];
    addLocationScroll('');
	viewLocationsPage(id,'locationspage','reset');
  }

  function showlocation(){
    if($('#switchbtn').hasClass('map')){
      backstepLocations.push('map');
	} else {
      backstepLocations.push('list');
      $("#listloc .item").unbind('click');
	}
	$('#hpbackbtn').css({'display':'block'});
    $('#locationspage #single').css('display','block');
    $('#locationspage #listloc, #locationshdr, #map_canvas').css('display','none');
	$('#switchbtn').unbind('mousedown');
	addLocationScroll('lili');
  }

  function locSearchText(){
    if($('#locsearchtxt').val() == 'City, ST or Zip'){
      $('#locsearchtxt').val('');
    }
    else if($('#locsearchtxt').val() == ''){
      $('#locsearchtxt').val('City, ST or Zip');
    }
  }
  
  /* End Locations Page */
  
  /* Recipes Page */
  
  function addRecipeScroll(id){
    if(recipeScroll != null){
	  recipeScroll.destroy();
      recipeScroll = null;
	}
	if(id != ''){
      recipeScroll = new iScroll(id);
	}
  }
  
  function viewRecipesPage(id,where){
    $('#recipesbtn').addClass('on');
    $('#'+where).addClass('pageview');
    $('header #pagetitle').css({'background-image':'url(img/recipes/recipes_hdr.png)','background-size':'137px 19px'});
	$('header #pagetitle').unbind('click').bind('click',function(){
	  if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Recipes","Header > Button Press","Reset",1); }
	  resetRecipesPage($(this).attr('id'));
	});
	if(backstepRecipes.length == 0){
      $('#hpbackbtn').css({'display':'none'});
      $('#recfilterbtnarea').css({'display' : 'block'});
	} else if(backstepRecipes.length == 1){
      $('#hpbackbtn').css({'display':'block'});
      $('#recscroller #reclist .item').bind('click', function(){ checkSingleRecipeData($(this).attr('rel')); return false; });
	} else {
      $('#hpbackbtn').css({'display':'block'});
	}
	currentPage = 'recipespage';
  }
  
  function releaseRecipesPage(){
    if(backstepRecipes.length == 1){
      $('#recscroller #reclist .item').unbind('click');
	} else if(backstepRecipes.length == 2){
      $('#recipespage #single #btns .overviewbtn').unbind('click');
      $('#recipespage #single #btns .ingredientsbtn').unbind('click');
      $('#recipespage #single #btns .directionsbtn').unbind('click');
	}
  }
  
  function resetRecipesPage(id){
    if(backstepRecipes[(backstepRecipes.length-1)] == 'list'){
      $('#recipespage #single').css('display','none');
      $('#recipespage #single #btns .overviewbtn').unbind('click');
      $('#recipespage #single #btns .ingredientsbtn').unbind('click');
      $('#recipespage #single #btns .directionsbtn').unbind('click');
    } else if(backstepRecipes[(backstepRecipes.length-1)] == 'recipefilters'){
      $('#recscroller #reclist .item').unbind('click');
      $('#recipespage #listrec').css('display','none');
    }
    $('#recsearchtxt').val('Search Recipes');
    $('#recfilterscoller div.recicon').removeClass('reciconon');
	$('#ingterm, #dshterm, #occterm').html('');
    $('#ps1, #ps2').removeClass('plusspaceon');
    //$('#recipefilters').css('height',($('body').height()-($('header').height()+$('footer').height())+100)+30);
    $('#recipefilters').css({'display' : 'block'});
	addRecipeScroll('recipefilters');
	backstepRecipes = [];
	viewRecipesPage(id,'recipespage');
  }

  function showrecipe(){
    backstepRecipes.push('list');
	$('#hpbackbtn').css({'display':'block'});
    $('#recipespage #single').css('display','block');
    $('#recscroller #reclist .item').unbind('click');
    $('#recipespage #listrec').css('display','none');
    $('#recipespage #single #btns .overviewbtn').bind('click',showoverview);
    $('#recipespage #single #btns .ingredientsbtn').bind('click',showingredients);
    $('#recipespage #single #btns .directionsbtn').bind('click',showdirections);
	addRecipeScroll('rili');
	showoverview();
  }
  
  function showoverview(){
    if(!$('#recipespage #single #ritem .item #overview').hasClass('shower')){
      if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Recipes","Details > Button Press","Overview",1); }
      $('#recipespage #single #btns .on').removeClass('on');
      $('#recipespage #single #btns .overviewbtn').addClass('on');
      $('#recipespage #single #ritem .item .shower').removeClass('shower').addClass('shownone');
      $('#recipespage #single #ritem .item #overview').removeClass('shownone').addClass('shower');
	  addRecipeScroll('rili');
    }
  }
  
  function showingredients(){
    if(!$('#recipespage #single #ritem .item #ingredients').hasClass('shower')){
      if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Recipes","Details > Button Press","Ingredients",1); }
      $('#recipespage #single #btns .on').removeClass('on');
      $('#recipespage #single #btns .ingredientsbtn').addClass('on');
      $('#recipespage #single #ritem .item .shower').removeClass('shower').addClass('shownone');
      $('#recipespage #single #ritem .item #ingredients').removeClass('shownone').addClass('shower');
	  addRecipeScroll('rili');
    }
  }
  
  function showdirections(){
    if(!$('#recipespage #single #ritem .item #directions').hasClass('shower')){
      if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Recipes","Details > Button Press","Directions",1); }
      $('#recipespage #single #btns .on').removeClass('on');
      $('#recipespage #single #btns .directionsbtn').addClass('on');
      $('#recipespage #single #ritem .item .shower').removeClass('shower').addClass('shownone');
      $('#recipespage #single #ritem .item #directions').removeClass('shownone').addClass('shower');
	  addRecipeScroll('rili');
    }
  }
  function recSearchText(){
    if($('#recsearchtxt').val() == 'Search Recipes'){
      $('#recsearchtxt').val('');
    }
    else if($('#recsearchtxt').val() == ''){
      $('#recsearchtxt').val('Search Recipes');
    }
  }

  $('#recfilterscoller div.recicon').live('touchstart',function(){
    wasTouched = true;
  });
  $('#recfilterscoller div.recicon').live('touchend',function(){
    if(didMove){
      didMove = false;
    }
    else{
      if($(this).hasClass('reciconon')){
        $(this).removeClass('reciconon');
        if($(this).hasClass('ing')){
          $('#ingterm').html('');
        }
        else if($(this).hasClass('dsh')){
          $('#dshterm').html('');
        }
        else if($(this).hasClass('occ')){
          $('#occterm').html('');
        }
      }
      else{
        if($(this).hasClass('ing')){
          $('#recfilterscoller div.ing').removeClass('reciconon');
          $('#ingterm').html($(this).attr('id'));
        }
        else if($(this).hasClass('dsh')){
          $('#recfilterscoller div.dsh').removeClass('reciconon');
      var term = $(this).attr('id');
      if(term == 'maind'){
        term = 'main';
      }
          $('#dshterm').html(term);
        }
        else if($(this).hasClass('occ')){
          $('#recfilterscoller div.occ').removeClass('reciconon');
          $('#occterm').html($(this).attr('id'));
        }
        $(this).addClass('reciconon');
      }
      updateRecFilters();
    }
    wasTouched = false;
  });

  function updateRecFilters(){
    if($('#ingterm').html() != '' && ($('#dshterm').html() != '' || $('#occterm').html() != '')){
      $('#ps1').addClass('plusspaceon');
    }
    else{
      $('#ps1').removeClass('plusspaceon');
    }
    if($('#dshterm').html() != '' && $('#occterm').html() != ''){
      $('#ps2').addClass('plusspaceon');
    }
    else{
      $('#ps2').removeClass('plusspaceon');
    }
  }
  
  function setRecipeBtnHack(platform){
    if(platform == 'Android'){
      $('#recfilterbtn').live('click',function(){
        rcpfilters = [];
        $('.reciconon').each(function(){
          var key = '';
          if($(this).hasClass('ing')){
            key = 'ing';
          }
          else if($(this).hasClass('dsh')){
            key = 'dsh';
          }
          else if($(this).hasClass('occ')){
            key = 'occ';
          }
          var val = $(this).attr('rel');
          rcpfilters[key] = val;
        });
        filterRecipeData(rcpfilters);
        return false;
      });
    }
    else{
      $('#recfilterbtn').live('touchend',function(){
        rcpfilters = [];
        $('.reciconon').each(function(){
          var key = '';
          if($(this).hasClass('ing')){
            key = 'ing';
          }
          else if($(this).hasClass('dsh')){
            key = 'dsh';
          }
          else if($(this).hasClass('occ')){
            key = 'occ';
          }
          var val = $(this).attr('rel');
          rcpfilters[key] = val;
        });
        filterRecipeData(rcpfilters);
        return false;
      });
    }
  }
  
  /* End Recipes Page */
  
  /* Blogs Page */
  
  function addBlogScroll(id){
	if(blogScroll != null){
      blogScroll.destroy();
      blogScroll = null;
	}
	if(id != ''){
      blogScroll = new iScroll(id);
	}
  }
  
  function viewBlogsPage(id,where){
    $('#blogbtn').addClass('on');
    $('#'+where).addClass('pageview');
    $('header #pagetitle').css({'background-image':'url(img/blog/blog_hdr.png)','background-size':'174px 19px'});
	$('header #pagetitle').unbind('click').bind('click',function(){
	  if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Guy's Updates","Header > Button Press","Reset",1); }
	  resetBlogsPage($(this).attr('id'));
	});
    if(id == 'blomore'){
      var blog_id = $('#blomore').attr('data-id');
      showblogpost(blog_id);
    } else if(backstepBlogs.length == 0){
	  $('#hpbackbtn').css({'display':'none'});
    $('#blogviewport #list .item').bind('touchstart', function(){
          wasTouched = true;
        });
      $("#blogviewport #list .item").bind('touchend', function(){
        if(didMove){
          didMove = false;
        }
        else{
          if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Guy's Updates","Page Load",$(this).children('.title').html(),1); }
          showblogpost($(this).attr('rel'));
        }
        wasTouched = false;
        //return false;
      });
	} else {
	  $('#hpbackbtn').css({'display':'block'});
	}
	currentPage = 'blogpage';
  }
  
  function releaseBlogsPage(){
    if(backstepBlogs.length == 0){
      $('#blogviewport #list .item').unbind('touchstart');
      $('#blogviewport #list .item').unbind('touchend');
	}
  }
  
  function resetBlogsPage(id){
    $("#blogviewport #list .item").unbind('touchstart');
    $("#blogviewport #list .item").unbind('touchend');
    $('#blogviewport #singles').css('display','none');
    $('#blogviewport #list').css('display','block');
	backstepBlogs = [];
	viewBlogsPage(id,'blogpage');
  }

  function showblogpost(bid){
    backstepBlogs.push('');
	$('#hpbackbtn').css({'display':'block'});
    $('header #pagetitle').css({'background-image':'url(img/blog/blog_hdr.png)','background-size':'174px 19px'});
    $('#blogviewport #bitems li.show').removeClass('show');
    $('#'+bid).addClass('show');
    $('#'+bid+' a').attr('target','_blank');
    updateBlogBtns();
    $('#blogviewport #singles').css('display','block');
    $('#blogviewport #list').css('display','none');
	addBlogScroll(bid);
  }

  function prevBlog(){
    var prev = $('#blogviewport #bitems li.show').prev('li');
    if(prev.length > 0){
      $('#blogviewport #bitems li.show').removeClass('show');
      prev.addClass('show');
	  addBlogScroll(prev.attr('id'));
      if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Guy's Updates","Previous Button Press",$('#'+$('#blogviewport #bitems li.show').attr('id')+' .title').html(),1); gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Guy's Updates","Page Load",$('#'+prev.attr('id')+' .title').html(),1); }
      updateBlogBtns();
    }
  }

  function nextBlog(){
    var next = $('#blogviewport #bitems li.show').next('li');
    if(next.length > 0){
      $('#blogviewport #bitems li.show').removeClass('show');
      next.addClass('show');
	  addBlogScroll(next.attr('id'));
      if(gaPluginInitialized){ gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Guy's Updates","Next Button Press",$('#'+$('#blogviewport #bitems li.show').attr('id')+' .title').html(),1); gaPlugin.trackEvent(GATrackEventResultHandler,GATrackEventErrorHandler,"Guy's Updates","Page Load",$('#'+next.attr('id')+' .title').html(),1); }
      updateBlogBtns();
    }
  }

  function updateBlogBtns(){
    var prev = $('#blogviewport #bitems li.show').prev('li');
    var next = $('#blogviewport #bitems li.show').next('li');
    if(prev.length > 0){
      $('#blogviewport #btns div.prev').css('display', 'block');
    }
    else{
      $('#blogviewport #btns div.prev').css('display', 'none');
    }
    if(next.length > 0){
      $('#blogviewport #btns div.next').css('display', 'block');
    }
    else{
      $('#blogviewport #btns div.next').css('display', 'none');
    }
  }
  
  /* End Blogs Page */
  
  function translatePageNames(name,section){
	  var pageName = '';
	  if(section == 'Home'){
			  switch(name){
				  case 'locationspage':
					pageName = 'Hotspots';
					break;
				  case 'recipespage':
					pageName = 'Guy\'s Dishes';
					break;
				  case 'blogpage':
					pageName = 'Read On';
					break;
			  }
	  } else {
			  switch(name){
				  case 'homepage':
					pageName = 'Home';
					break;
				  case 'locationspage':
					pageName = 'Locations';
					break;
				  case 'recipespage':
					pageName = 'Recipes';
					break;
				  case 'blogpage':
					pageName = 'Guy\'s Updates';
					break;
			  }
	  }
	  return pageName;
  }
