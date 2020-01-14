/*
 * Frontend Logic for application
 *
 */

// Container for frontend application
var app = {};

// Config
app.config = {
  'sessionToken' : false
};

// AJAX Client (for RESTful API)
app.client = {}

// Interface for making API calls
app.client.request = function(headers,path,method,queryStringObject,payload,callback){

  // Set defaults
  headers = typeof(headers) == 'object' && headers !== null ? headers : {};
  path = typeof(path) == 'string' ? path : '/';
  method = typeof(method) == 'string' && ['POST','GET','PUT','DELETE'].indexOf(method.toUpperCase()) > -1 ? method.toUpperCase() : 'GET';
  queryStringObject = typeof(queryStringObject) == 'object' && queryStringObject !== null ? queryStringObject : {};
  payload = typeof(payload) == 'object' && payload !== null ? payload : {};
  callback = typeof(callback) == 'function' ? callback : false;

  // For each query string parameter sent, add it to the path
  var requestUrl = path+'?';
  var counter = 0;
  for(var queryKey in queryStringObject){
     if(queryStringObject.hasOwnProperty(queryKey)){
       counter++;
       // If at least one query string parameter has already been added, preprend new ones with an ampersand
       if(counter > 1){
         requestUrl+='&';
       }
       // Add the key and value
       requestUrl+=queryKey+'='+queryStringObject[queryKey];
     }
  }

  // Form the http request as a JSON type
  var xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader("Content-type", "application/json");

  // For each header sent, add it to the request
  for(var headerKey in headers){
     if(headers.hasOwnProperty(headerKey)){
       xhr.setRequestHeader(headerKey, headers[headerKey]);
     }
  }

  // If there is a current session token set, add that as a header
  if(app.config.sessionToken){
    xhr.setRequestHeader("token", app.config.sessionToken.id);
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = function() {
      if(xhr.readyState == XMLHttpRequest.DONE) {
        var statusCode = xhr.status;
        var responseReturned = xhr.responseText;

        // Callback if requested
        if(callback){
          try{
            var parsedResponse = JSON.parse(responseReturned);
            callback(statusCode,parsedResponse);
          } catch(e){
            callback(statusCode,false);
          }

        }
      }
  }

  // Send the payload as JSON
  var payloadString = JSON.stringify(payload);
  xhr.send(payloadString);

};


// Bind the logout button
app.bindLogoutButton = function(){
  document.getElementById("logoutButton").addEventListener("click", function(e){

    // Stop it from redirecting anywhere
    e.preventDefault();

    // Log the user out
    app.logUserOut();

  });
};

// Log the user out then redirect them
app.logUserOut = function(redirectUser){
    // Set redirectUser to default to true
    redirectUser = typeof(redirectUser) == 'boolean' ? redirectUser : true;
  
    // Get the current token id
    var tokenId = typeof(app.config.sessionToken.id) == 'string' ? app.config.sessionToken.id : false;
  
    // Send the current token to the tokens endpoint to delete it
    var queryStringObject = {
      'id' : tokenId
    };
    app.client.request(undefined,'api/tokens','DELETE',queryStringObject,undefined,function(statusCode,responsePayload){
      // Set the app.config token as false
      app.setSessionToken(false);
  
      // Send the user to the logged out page
      if(redirectUser){
        window.location = '/session/deleted';
      }
  
    });
  };

// Bind the forms
app.bindForms = function(){
    if(document.querySelector("form")){
  
      var allForms = document.querySelectorAll("form");
      for(var i = 0; i < allForms.length; i++){
          allForms[i].addEventListener("submit", function(e){
  
          // Stop it from submitting
          e.preventDefault();
          var formId = this.id;
          var path = this.action;
          var method = this.method.toUpperCase();
            console.log(formId);
          // Hide the error message (if it's currently shown due to a previous error)
          document.querySelector("#"+formId+" .formError").style.display = 'none';
  
          // Hide the success message (if it's currently shown due to a previous error)
          if(document.querySelector("#"+formId+" .formSuccess")){
            document.querySelector("#"+formId+" .formSuccess").style.display = 'none';
          }
  
  
          // Turn the inputs into a payload
          var payload = {};
          var elements = this.elements;
          for(var i = 0; i < elements.length; i++){
            if(elements[i].type !== 'submit'){
              // Determine class of element and set value accordingly
              var classOfElement = typeof(elements[i].classList.value) == 'string' && elements[i].classList.value.length > 0 ? elements[i].classList.value : '';
              var valueOfElement = elements[i].type == 'checkbox' && classOfElement.indexOf('multiselect') == -1 ? elements[i].checked : classOfElement.indexOf('intval') == -1 ? elements[i].value : parseInt(elements[i].value);
              var elementIsChecked = elements[i].checked;
              // Override the method of the form if the input's name is _method
              var nameOfElement = elements[i].name;
              if(nameOfElement == '_method'){
                method = valueOfElement;
              } else {
                // Create an payload field named "method" if the elements name is actually httpmethod
                if(nameOfElement == 'httpmethod'){
                  nameOfElement = 'method';
                }
                // Create an payload field named "id" if the elements name is actually uid
                if(nameOfElement == 'uid'){
                  nameOfElement = 'id';
                }
                // If the element has the class "multiselect" add its value(s) as array elements
                if(classOfElement.indexOf('multiselect') > -1){
                  if(elementIsChecked){
                    payload[nameOfElement] = typeof(payload[nameOfElement]) == 'object' && payload[nameOfElement] instanceof Array ? payload[nameOfElement] : [];
                    payload[nameOfElement].push(valueOfElement);
                  }
                } else {
                  payload[nameOfElement] = valueOfElement;
                }
  
              }
            }
          }
  
  
          // If the method is DELETE, the payload should be a queryStringObject instead
          var queryStringObject = method == 'DELETE' ? payload : {};
          
          // Call the API
          app.client.request(undefined,path,method,queryStringObject,payload,function(statusCode,responsePayload){
            // Display an error on the form if needed
            if(statusCode !== 200){
  
              if(statusCode == 403){
                // log the user out
                //app.logUserOut();
  
              } else {
  
                // Try to get the error from the api, or set a default error message
                var error = typeof(responsePayload.Error) == 'string' ? responsePayload.Error : 'An error has occured, please try again';
  
                // Set the formError field with the error text
                document.querySelector("#"+formId+" .formError").innerHTML = error;
  
                // Show (unhide) the form error field on the form
                document.querySelector("#"+formId+" .formError").style.display = 'block';
              }
            } else {
              // If successful, send to form response processor
              app.formResponseProcessor(formId,payload,responsePayload);
            }
  
          });
        });
      }
    }
  };

  // Form response processor
app.formResponseProcessor = function(formId,requestPayload,responsePayload){
    var functionToCall = false;
    // If account creation was successful, try to immediately log the user in
    if(formId == 'accountCreate'){
        console.log("created new user");
      // Take the phone and password, and use it to log the user in
      var newPayload = {
        'email' : requestPayload.email,
        'password' : requestPayload.password
      };
  
      app.client.request(undefined,'api/tokens','POST',undefined,newPayload,function(newStatusCode,newResponsePayload){
        // Display an error on the form if needed
        if(newStatusCode !== 200){
  
          // Set the formError field with the error text
          document.querySelector("#"+formId+" .formError").innerHTML = 'Sorry, an error has occured. Please try again.';
  
          // Show (unhide) the form error field on the form
          document.querySelector("#"+formId+" .formError").style.display = 'block';
  
        } else {
          // If successful, set the token and redirect the user
          app.setSessionToken(newResponsePayload);
          window.location = '/menus/all';
        }
      });
    }
    // If login was successful, set the token in localstorage and redirect the user
    if(formId == 'sessionCreate'){
      app.setSessionToken(responsePayload);
      window.location = '/menus/all';
    }
  
    // If forms saved successfully and they have success messages, show them
    var formsWithSuccessMessages = ['accountEdit1', 'accountEdit2','checksEdit1', "cartsAdd"];
    if(formsWithSuccessMessages.indexOf(formId) > -1){
      document.querySelector("#"+formId+" .formSuccess").style.display = 'block';
    }
  
    // If the user just deleted their account, redirect them to the account-delete page
    if(formId == 'accountEdit3'){
      app.logUserOut(false);
      window.location = '/account/deleted';
    }
  
    if(formId == 'checkoutCreate'){
      window.location = '/checkout/success';
    }
  };

  // Get the session token from localstorage and set it in the app.config object
app.getSessionToken = function(){
    var tokenString = localStorage.getItem('token');
    if(typeof(tokenString) == 'string'){
      try{
        var token = JSON.parse(tokenString);
        app.config.sessionToken = token;
        if(typeof(token) == 'object'){
          app.setLoggedInClass(true);
        } else {
          app.setLoggedInClass(false);
        }
      }catch(e){
        app.config.sessionToken = false;
        app.setLoggedInClass(false);
      }
    }
  };
  
  // Set (or remove) the loggedIn class from the body
  app.setLoggedInClass = function(add){
    var target = document.querySelector("body");
    if(add){
      target.classList.add('loggedIn');
    } else {
      target.classList.remove('loggedIn');
    }
  };
  
  // Set the session token in the app.config object as well as localstorage
  app.setSessionToken = function(token){
    app.config.sessionToken = token;
    var tokenString = JSON.stringify(token);
    localStorage.setItem('token',tokenString);
    if(typeof(token) == 'object'){
      app.setLoggedInClass(true);
    } else {
      app.setLoggedInClass(false);
    }
  };
  
  // Renew the token
  app.renewToken = function(callback){
    var currentToken = typeof(app.config.sessionToken) == 'object' ? app.config.sessionToken : false;
    if(currentToken){
      // Update the token with a new expiration
      var payload = {
        'id' : currentToken.id,
        'extend' : true,
      };
      app.client.request(undefined,'api/tokens','PUT',undefined,payload,function(statusCode,responsePayload){
        // Display an error on the form if needed
        if(statusCode == 200){
          // Get the new token details
          var queryStringObject = {'id' : currentToken.id};
          app.client.request(undefined,'api/tokens','GET',queryStringObject,undefined,function(statusCode,responsePayload){
            // Display an error on the form if needed
            if(statusCode == 200){
              app.setSessionToken(responsePayload);
              callback(false);
            } else {
              app.setSessionToken(false);
              callback(true);
            }
          });
        } else {
          app.setSessionToken(false);
          callback(true);
        }
      });
    } else {
      app.setSessionToken(false);
      callback(true);
    }
  };

  // Loop to renew token often
app.tokenRenewalLoop = function(){
    setInterval(function(){
      app.renewToken(function(err){
        if(!err){
          console.log("Token renewed successfully @ "+Date.now());
        }
      });
    },1000 * 60);
  };

  // Load data on the page
app.loadDataOnPage = function(){
    // Get the current page from the body class
    var bodyClasses = document.querySelector("body").classList;
    var primaryClass = typeof(bodyClasses[0]) == 'string' ? bodyClasses[0] : false;
  
    // Logic for account settings page
    if(primaryClass == 'accountEdit'){
      app.loadAccountEditPage();
    }
  
    // Logic for dashboard page
    if(primaryClass == 'menusList'){
      app.loadmenusListPage();
    }

    // Logic for View Menu page
    if(primaryClass == 'menusView'){
      app.loadmenusViewPage();
    }

    // Logic for View Cart page
    if (primaryClass === "cartsList") {
      app.loadcartsListPage();
    }

    if (primaryClass === "checkoutCreate") {
      app.loadcartsListPage();
    }
    if (primaryClass === "purchasesList") {
      app.loadpurchasesListPage();
    }
  };

  app.bindCartItemsRemoval = function() {
     // Get the current page from the body class
     var bodyClasses = document.querySelector("body").classList;
     var primaryClass = typeof(bodyClasses[0]) == 'string' ? bodyClasses[0] : false;
     // Logic for View Cart page
     var allowedClasses = ["cartList", "checkoutCreate"];
    if (allowedClasses.indexOf(primaryClass) > -1) {
      document.querySelector("#cartsListTable").addEventListener("click", function(e) {
        e.preventDefault();
        if (typeof(e.target) === "object" && typeof(e.target.href) === "string") {
          var id = typeof(e.target.href.split("=")[1]) === "string" && e.target.href.split("=")[1] > 0 ? 
          e.target.href.split("=")[1] : false;
          if (id) {
            var payload = {
              "id" : +id
            };
            app.client.request(undefined,'api/carts','DELETE', undefined, payload,function(statusCode,responsePayload){
              if(statusCode == 200){
                if (primaryClass === "cartList") {
                  window.location = "carts/all";

                } else if (primaryClass === "checkoutCreate") {
                  window.location = "checkout/create";
                }
              } else {
                // If the request comes back as something other than 200, redirect back to dashboard
                console.log("could not remove item from cart.");
              }
            });
          }
        }
      })
    }
  }


  // Load the account edit page specifically
app.loadAccountEditPage = function(){
  app.client.request(undefined,'api/users','GET', undefined, undefined,function(statusCode,responsePayload){
    if(statusCode == 200){
      // Put the data into the forms as values where needed
      document.querySelector("#accountEdit1 .firstNameInput").value = responsePayload.firstName;
      document.querySelector("#accountEdit1 .lastNameInput").value = responsePayload.lastName;
      document.querySelector("#accountEdit1 .displayEmailInput").value = responsePayload.email;
      document.querySelector("#accountEdit1 .addressInput").value = responsePayload.address;

    } else {
      // If the request comes back as something other than 200, log the user our (on the assumption that the api is temporarily down or the users token is bad)
      app.logUserOut();
    }
  });
};


  // Load the dashboard page specifically
app.loadmenusListPage = function(){
    app.client.request(undefined,'api/menu','GET',undefined,undefined,function(statusCode,responsePayload){
        if(statusCode == 200){
          var menuData = responsePayload;
            if (typeof(menuData) === "object" && Array.isArray(menuData) === true) {
                menuData.forEach(function(rowData) {
                    // Make the check data into a table row
                    var table = document.getElementById("menusListTable");
                    var tr = table.insertRow(-1);
                    tr.classList.add('checkRow');
                    var td0 = tr.insertCell(0);
                    var td1 = tr.insertCell(1);
                    var td2 = tr.insertCell(2);
                    var td3 = tr.insertCell(3);
                    var td4 = tr.insertCell(4);
                    var td5 = tr.insertCell(5);
                    td0.innerHTML = "<img src='"+ rowData.photo_url+"' width='50' height='50'> "
                    td1.innerHTML = rowData.id;
                    td2.innerHTML = rowData.name;
                    td3.innerHTML = rowData.quantity;
                    td4.innerHTML = rowData.price
                    td5.innerHTML = '<a href="/menus/view?id='+rowData.id+'">Add to Cart </a>';
                });
            }
        } else {
            if (statusCode === 403) {
                app.logUserOut();
            }
            console.log("Could not load menus. Please try again", statusCode);
        }
      });
  };

app.loadmenusViewPage =function(){
  // Get the check id from the query string, if none is found then redirect back to dashboard
  var id = typeof(window.location.href.split('=')[1]) == 'string' && window.location.href.split('=')[1].length > 0 ? window.location.href.split('=')[1] : false;
  if(id){
    // Fetch the check data
    var queryStringObject = {
      'id' : id
    };
    app.client.request(undefined,'api/menu','GET',queryStringObject,undefined,function(statusCode,responsePayload){
      if(statusCode == 200){

        // Put the hidden id field into both forms
        var hiddenIdInputs = document.querySelectorAll("input.hiddenIdInput");
        for(var i = 0; i < hiddenIdInputs.length; i++){
            hiddenIdInputs[i].value = responsePayload.id;
        }

        // Put the data into the top form as values where needed
        document.querySelector("#menuItemImage").src = responsePayload.photo_url;
        document.querySelector("#itemName").innerText = responsePayload.name;
        document.querySelector("#itemPrice").innerText = responsePayload.price;

      } else {
        // If the request comes back as something other than 200, redirect back to dashboard
        window.location = '/menus/all';
      }
    });
  } else {
    window.location = '/menus/all';
  }
}

  // Load the dashboard page specifically
  app.loadcartsListPage = function(){
    app.client.request(undefined,'api/carts','GET',undefined,undefined,function(statusCode,responsePayload){
        if(statusCode == 200){
          var cartItems = responsePayload.items;        
            if (typeof(cartItems) === "object" && Array.isArray(cartItems) === true && cartItems.length > 0) {
              cartItems.forEach(function(rowData) {
                    // Make the check data into a table row
                    var table = document.getElementById("cartsListTable");
                    var tr = table.insertRow(-1);
                    tr.classList.add('cartRow');
                    var td0 = tr.insertCell(0);
                    var td1 = tr.insertCell(1);
                    var td2 = tr.insertCell(2);
                    var td3 = tr.insertCell(3);
                    var td4 = tr.insertCell(4);
                    td0.innerHTML = rowData.id;
                    td1.innerHTML = rowData.name;
                    td2.innerHTML = rowData.quantity;
                    td3.innerHTML = rowData.price
                    td4.innerHTML = '<a href="/carts/view?id='+rowData.id+'"> Remove  </a>';
                });
                var table = document.getElementById("cartsListTable");
                    var tr = table.insertRow(-1);
                    tr.classList.add('cartRow');
                    var td0 = tr.insertCell(0);
                    var td1 = tr.insertCell(1);
                    var td2 = tr.insertCell(2);
                    var td3 = tr.insertCell(3);
                    var td4 = tr.insertCell(4);
                    td0.innerHTML = "<b>Total Price </b>";
                    td1.innerHTML = "";
                    td2.innerHTML = "";
                    td3.innerHTML = "";
                    td4.innerHTML = responsePayload.totalPrice;

                    // make the checkout button active
                    document.querySelector(".cta.green").style.display = "block";
            }
        } else {
          
            if (statusCode === 403) {
                app.logUserOut();
            }
            console.log("Could not load carts. Please try again", statusCode);
        }
      });
  };

// Load the dashboard page specifically
app.loadpurchasesListPage = function(){
  app.client.request(undefined,'api/purchases','GET',undefined,undefined,function(statusCode,responsePayload){
      if(statusCode == 200){
        var purchasedItems = responsePayload;
          if (typeof(purchasedItems) === "object" && Array.isArray(purchasedItems) === true && purchasedItems.length > 0) {
            purchasedItems.forEach(function(rowData) {
                  // Make the check data into a table row
                  var table = document.getElementById("purchasesListTable");
                  var tr = table.insertRow(-1);
                  tr.classList.add('purchaseRow');
                  var td0 = tr.insertCell(0);
                  var td1 = tr.insertCell(1);
                  var td2 = tr.insertCell(2);
                  var td3 = tr.insertCell(3);
                  td0.innerHTML = rowData.id;
                  let items = "<ul>"
                  rowData.items.forEach(function(item) {
                    items += "<li> " + item.name + " * " +  item.quantity +  "</li>";
                  });
                  items += "</ul>";
                  td1.innerHTML = items;
                  td2.innerHTML = rowData.totalPrice;
                  td3.innerHTML = (new Date(rowData.created_at )).toLocaleString()
              });
          }
      } else {
        
          if (statusCode === 403) {
              app.logUserOut();
          }
          console.log("Could not load carts. Please try again", statusCode);
      }
    });
};

  // Init (bootstrapping)
app.init = function(){

    // Bind all form submissions
    app.bindForms();
  
    // Bind logout logout button
    app.bindLogoutButton();
  
    // Get the token from localstorage
    app.getSessionToken();
  
    // Renew token
    app.tokenRenewalLoop();
  
    // Load data on page
    app.loadDataOnPage();

    app.bindCartItemsRemoval();
  
  };

  // Call the init processes after the window loads
window.onload = function(){
    app.init();
  };