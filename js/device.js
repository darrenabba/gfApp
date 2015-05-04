/*check data connection // checkdataversion if connected*/
function checkConnection(updateData){
  console.log('checkConnection Ran');
  console.log(updateData);
  // var networkState = navigator.network.connection.type;
  // var states = {};
  // states[Connection.UNKNOWN]  = false;
  // states[Connection.NONE]     = false;
  // states['null']              = false;
  // states[Connection.ETHERNET] = true;
  // states[Connection.WIFI]     = true;
  // states[Connection.CELL_2G]  = true;
  // states[Connection.CELL_3G]  = true;
  // states[Connection.CELL_4G]  = true;
  //constate = states[networkState];
  constate = true;
  if(updateData)checkUpdateData();
}

function alertCallback(){
  //null
}