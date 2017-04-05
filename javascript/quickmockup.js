$(function() {
	
	/**
	 * ============================
	 *     gestion des éléments
	 * ============================
	 */
	
	/**
	 * Setup des éléments
	 */
	var setupElements = function() {
		
		//setup canevas
		makeDropableElement("#canevas");
		//setup elements already on the page
		$(".element").each(function(index, element) {
			$(element).find(".ui-resizable-handle").remove(); //otherwise we get them twice, they are saved with the file and created again when the element is initialized
			setupElement(element);
		});
		
		// make new sidebar elements draggable
		$(".element--nouveau").draggable({
			distance: 4,
			disabled: false,
			appendTo: "body",
			helper: "clone",
			revert: "invalid",
			zIndex: 999
		});
	}
	
	/**
	 * Setup d'un élément
	 */
	var setupElement = function(element) {
		makeMovableElement(element);
		makeDropableElement(element);
		$(element).editText();
		makeSelectableElement(element, "#canevas");
	};
	
	/**
	 * Rendre les éléments déplaçables
	 */
	var makeMovableElement = function(element) {
		//in case it already has the handle-elements (markup was duplicated or saved and now reloaded...)
		$(element)
		.children(".ui-resizable-handle") //find handles, which are direct decendants...
		.remove(); //remove them (not useful when displaying)
		
		//now, make it draggable.
		$(element).draggable({
			distance: 4,
			disabled: false,
			revert: "invalid",
			zIndex: 999
		}).resizable({
			handles: "all"
		});
	};
	
	/**
	 * Rendre les éléments lachables
	 */
	var makeDropableElement = function(element) {
		$(element).droppable({
			accept: ".element, .element--nouveau",
			tolerance: "fit",
			greedy: true, //you can only attach it to one element, otherwise every nested dropable receives
			hoverClass: "drop-hover",
			drop: function(event, ui) {
				//calculate offset of both
				var elementToAppend = null;
				
				if (ui.draggable.hasClass("element--nouveau")) { //if this is a new element
					elementToAppend = ui.draggable.clone(false);
					elementToAppend.removeClass("element--nouveau");
					
					elementToAppend.addClass("element");
					elementToAppend.css("position", "absolute"); //always has relative otherwise = glitches
					
					var idnr = parseInt(Math.random() * 100000000000000); //not exactly a UUID but does the job for now.
					
					elementToAppend.attr("id", "element_" + idnr);
					//TODO: assign an id "editable"+idnr
					
					elementToAppend.find(".editable").first().attr("id", "editable_" + idnr);
					
					setupElement(elementToAppend);
				} else {
					elementToAppend = ui.draggable;
				}
				
				var draggableOffset = ui.helper.offset(); //was ui.draggable
				var droppableOffset = $(this).offset();
				
				var newLeft = draggableOffset.left - droppableOffset.left;
				var newTop = draggableOffset.top - droppableOffset.top;
				
				elementToAppend.appendTo($(this)).css({
					top: newTop + "px",
					left: newLeft + "px"
				});
			}
		}); //droppable End
	}; //droppableWrapper End
	
	/**
	 * Sélectionner un élément
	 */
	var makeSelectableElement = function(element, selectorCanvasParam) {
		var $element = $(element);
		
		var selectorCanvas = selectorCanvasParam ? selectorCanvasParam : "body"; //if selectorCanvas is defined, set it to a standard value
		
		var selectedClassParam = "element--actif";
		var elementSelector = ".element";
		
		var $canevas = $(selectorCanvas);
		
		//deselect if canevas is clicked
		$canevas.click(function(event) {
			if (event.target === $canevas[0]) {
				$canevas.find("." + selectedClassParam).removeClass(selectedClassParam);
			}
		});
		
		//select the this element, deselect others. This is inefficient when you apply the function in batch, but makes much sense, when initializing single elements (dragging them on canevas) without, a new element is deselected, and needs to be clicked again. Since the performance is o.k. for now, I leave it like it is.
		$canevas.find("." + selectedClassParam).removeClass(selectedClassParam);
		$element.addClass(selectedClassParam); /*custom selected, since there is a jQuery UI selected, that might be used later*/
		
		$element.mousedown(function(event) {
			if ($(event.target).closest(elementSelector)[0] === $element[0]) { //either it is the same element that was clicked, or the element is the clicked element’s the first parent that is a mock element.
				
				$canevas.find("." + selectedClassParam).removeClass(selectedClassParam);
				
				$element.addClass(selectedClassParam); /*custom selected, since there is a jQuery UI selected, that might be used later*/
			}
		});
		
	};
	
	/**
	 * Dupliquer un élément
	 */
	var duplicateElement = function() {
		var $canevas = $("body");
		var $element2BDuplicated = $canevas.find(".element--actif");
		if ($element2BDuplicated.length === 0) {
			return; //no element selected, duplication of selected element is futile.
		}
		
		var clonedElement = $element2BDuplicated.clone(false); //clone all children too, don't clone events.

		//some elements have id
		var reassignID = function($element) {
			var oldId = $element.attr("id") || "";
			var oldIdNr = oldId.match(/^element_(\d+)/)[1]; //[1] to get the first capture group, , the id number.
			
			if (oldId.length > 0) { //if it actually had an Id
				var newIdNr = parseInt(Math.random() * 100000000000000);
				$element.attr("id", "element_" + newIdNr);
				$element.find("#editable_" + oldIdNr).attr("id", "editable_" + newIdNr);
			}
		};
		
		clonedElement.find(".element").each(function(index, element) {
			reassignID($(element));
		});
		reassignID($(clonedElement));
		
		var originalElementPos = $element2BDuplicated.position();
		clonedElement.css({
			left: (originalElementPos.left + 20) + "px",
			top: (originalElementPos.top + 20) + "px"
		});
		clonedElement.removeClass("element--actif");
		clonedElement.appendTo($element2BDuplicated.parent());
		
		clonedElement.find(".element").each(function(index, element) {
			setupElement(element);
		});
		setupElement(clonedElement);
		
	};
	
	/**
	 * Supprimer un élément
	 */
	var deleteElement = (function() { //revealing module pattern
		var recentlyDeleted = { //hope saving these does not cause memory leaks. FUD.
			$element: null,
			$formerParent: null
		};
		var canevasSelector = "body";
		var element2BDeletedSelector = ".element--actif";
		
		return {
			delete: function() {
				var $canevas = $(canevasSelector);
				var $element2BDeleted = $canevas.find(element2BDeletedSelector);
				
				recentlyDeleted.$formerParent = $element2BDeleted.parent(); //remember parent for re-attachment on redo
				recentlyDeleted.$element = $element2BDeleted.detach(); //delete element and store it  for re-attachment on redo
			},
			undelete: function() {
				
				if (!recentlyDeleted.$element || !recentlyDeleted.$formerParent) {
					return;
				}
				
				recentlyDeleted.$formerParent.append(recentlyDeleted.$element);
			}
		};
	}());
	
	/**
	 * Assainir un texte saisi par l'utilisateur
	 */
	var readStringToJquery = function(string) {
		var $importedHTML = $(string); //that feels weird. I suppose I should at least sanitize scripts.
		var $sanitizedHTML = $importedHTML.remove("script"); //test if the scripts dont execute or if this is FUD
		return $sanitizedHTML;
	};


	/**
	 * ==============
	 *     Divers
	 * ==============
	 */


	/**
	 * ?
	 */
	function appendJqueryToQuickmockupDom(jqueryObject) {
		//find container
		var $canevasWrap = $("#main");
		var $elements = $("#aside");
		//empty container;
		$canevasWrap.empty();
		$elements.empty();
		//fill container
		$canevasWrap.append(jqueryObject.find("#main").children());
		$elements.append(jqueryObject.find("#aside").children());
		//TODO: shall we do the init here as well? We could call the init function from here
		return undefined;
	}

	/**
	 * Ouvrir un template
	 * [FIXME] can we make this class as elementgetter?
	 */
	$("#loadFile").fileReaderJS({
		accept: 'text/*',
		readAsDefault: 'Text',
		on: {
			load: function(e, file) {
				appendJqueryToQuickmockupDom(readStringToJquery(e.target.result)); //ugly!!!
				setupElements();
			}
		}
	});

	/**
	 * Enregistrer un template
	 */
	function saveDocumentCode() {
		var padNumberWith0es = function(number, padding) {
			//number : the number you want to pad with 0es
			//padding: the length of the output string, 5 is 00000 and 00125 etc.
			if (padding + 1 < ("" + number).length) { //make padding at last as long as the number, so nothing is cut off.
				padding = ("" + number).length;
			}
			var zeroes = Array(padding + 1).join("0");
			var paddedNumber = (zeroes + number).slice(-(zeroes.length));
			return paddedNumber;
		};
		var currentDate = new Date();
		var year = currentDate.getFullYear();
		var month = currentDate.getMonth() + 1;
		var day = currentDate.getDate();
		var documentstring = document.documentElement.outerHTML;
		var blob = new Blob([documentstring], {
			type: "text/plain;charset=utf-8"
		});
		saveAs(blob, "" + year + month + day + "mockup.html");
	}


	/**
	 * ============================
	 *     Setup de l'interface
	 * ============================
	 */
	(function() {
		
		/**
		 * Modale pour changer la taille du canevas
		 * [TODO] Déplacer dans la colonne des paramètres, à afficher quand on sélectionne le canevas
		 */
		$("#changeCanvasSizeDialog").dialog({
			autoOpen: false,
			open: function(event, ui) {
				var $container = $("#canevas");
				
				var currentHeight = $container.height();
				var currentWidth = $container.width();
				
				//show current dimensions in the input filds
				$(this).
				find('input[name="height"]').
				val(currentHeight);
				
				$(this).
				find('input[name="width"]').
				val(currentWidth);
			},
			buttons: [{
				text: "OK",
				click: function() {
					var $container = $("#canevas");
					
					$container.
					height(
						$(this).find('input[name="height"]')
						.val()
					);
					$container.
					width(
						$(this).find('input[name="width"]').val()
					);
					$(this).dialog("close");
				}
			},
			{
				text: "Cancel",
				click: function() {
					$(this).dialog("close");
				}
			}]
		});
	
		/**
		 * Rustine pour fixer la hauteur de la colonne des éléments
		 * [TODO] Gérer redimensionnement fenêtre
		 * [FIXME] C'est une rustine, revoir les CSS :(
		 */
		var hauteur_aside = $(window).outerHeight() - ($('#header').outerHeight() + $('#footer').outerHeight());
		$('.aside__inner').css('height', hauteur_aside);
	
		/**
		 * Barre d'outils principale
		 */
		// Bouton supprimer
		$('[data-btn=supprimer-element]').click(deleteElement.delete); //delete button
		Mousetrap.bind(['del', 'backspace'], function(e) {
			if (e.preventDefault) {
				e.preventDefault();
			}
			deleteElement.delete();
		});
		// Bouton annuler
		$('[data-btn=annuler]').click(deleteElement.undelete);
		Mousetrap.bind(['ctrl+z', 'command+z'], deleteElement.undelete);
		// Bouton dupliquer
		$('[data-btn=dupliquer-element]').click(duplicateElement);
		Mousetrap.bind(['ctrl+d', 'command+d'], function(e) {
			if (e.preventDefault) {
				e.preventDefault();
			}
			duplicateElement();
		});
		// Bouton taille du canevas
		$('[data-btn=taille-canevas]').click(function() {
			$("#changeCanvasSizeDialog").dialog("open");
		});
		// Bouton enregistrer
		$('[data-btn=enregistrer-html]').click(function() {
			saveDocumentCode();
		})
		// Bouton ouvrir
		$('[data-btn=ouvrir-html]').click(function() {
			$("#loadFile").click();
		})
		// Bouton partager sur codepen
		$('[data-btn=codepen]').click(function() {
			var htmlSource = $("#main"),
			cssSource = $("#elementStyles");
			//if there is already a send-to-codepen-form, delete it
			$("form#sendToCodepen").remove();
			var htmlString = htmlSource.
			clone(). //for coming manipulations, so we don't actually change the original
			find(".ui-resizable-handle"). //find handles...
			remove(). //remove them (not useful when displaying)
			end(). //go out of the matched handles (via find) the the previous set (all in htmlSource)
			find("*"). //every element
			each(function(index, element) {
				var oldString = $(element).attr("data-editable-content") || "";
				//replace all ' and " by similar looking characters. //They can't be replaced by their actual html entities
				//since they have particular meaning (determine strings)
				//and thus mess up the syntax, since they would be replaced with the same chars like the characters that are actualy used to determine strings.
				$(element).attr(
					"data-editable-content",
					oldString.replace(/"/g, "&Prime;").replace(/'/g, "&prime;")
				);
			}).
			html();
			var cssString = cssSource
			.html();
			var data = {
				html: htmlString,
				css: cssString,
				js: ""
			};
			var jsonstring = JSON.stringify(data).replace(/"/g, "&quot;").replace(/'/g, "&apos;");
			var form =
			'<form id="sendToCodepen" action="http://codepen.io/pen/define" method="POST" target="_blank" style="display:none;">' +
			'<input type="hidden" name="data" value=\'' +
			jsonstring +
			'\'>' +
			'</form>';
			
			$(form).appendTo("body")
			$("#sendToCodepen").submit(); //$(form).submit fails in firefox
			
		});
	
		/**
		 * Colonnes redimensionnables
		 * [TODO] mutualiser
		 */
		$('[data-resizable=e]').resizable({
			handles: 'e',
		});
		$('[data-resizable=w]').resizable({
			handles: 'w',
		});

		/**
		 * Message pour ne pas perdre un template non enregistré
		 */
		/*window.onbeforeunload = function() {
			var message = $('.message-quitter').length() > 1 ?
				$('.message-quitter').html() : 
				'Do you want to close the application? Unsaved changes will be lost';
			return message;
		};*/
	
		/**
		 * Barres de défilement + drag and scroll
		 */
		$('#main')
			.perfectScrollbar()
			.dragScroll();
		$('.aside__inner').perfectScrollbar();
	
	})();

	// START
	setupElements();
});