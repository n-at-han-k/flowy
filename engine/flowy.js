var flowy = function(canvas, grab, release, snapping, rearrange, spacing_x, spacing_y) {
    // Initialize default callback functions
    if (!grab) grab = function() {};
    if (!release) release = function() {};
    if (!snapping) snapping = function() { return true; };
    if (!rearrange) rearrange = function() { return false; };

    if (!spacing_x) { spacing_x = 20 }
    if (!spacing_y) { spacing_y = 80 }

    var loaded = false;
    flowy.load = function() {
        if (!loaded)
            loaded = true;
        else
            return;
        var blocks = [];
        var blockstemp = [];
        var canvas_div = canvas;
        var absx = 0;
        var absy = 0;
        if (window.getComputedStyle(canvas_div).position == "absolute" || window.getComputedStyle(canvas_div).position == "fixed") {
            absx = canvas_div.getBoundingClientRect().left;
            absy = canvas_div.getBoundingClientRect().top;
        }
        var active = false;
        var paddingx = spacing_x;
        var paddingy = spacing_y;
        var offsetleft = 0;
        var rearrange = false;
        var drag, dragx, dragy, original;
        var mouse_x, mouse_y;
        var dragblock = false;
        var prevblock = 0;
        var el = document.createElement("DIV");
        el.classList.add('indicator');
        el.classList.add('invisible');
        canvas_div.appendChild(el);
        flowy.import = function(output) {
            canvas_div.innerHTML = output.html;
            for (var a = 0; a < output.blockarr.length; a++) {
                blocks.push({
                    childwidth: parseFloat(output.blockarr[a].childwidth),
                    parent: parseFloat(output.blockarr[a].parent),
                    id: parseFloat(output.blockarr[a].id),
                    x: parseFloat(output.blockarr[a].x),
                    y: parseFloat(output.blockarr[a].y),
                    width: parseFloat(output.blockarr[a].width),
                    height: parseFloat(output.blockarr[a].height)
                })
            }
            if (blocks.length > 1) {
                rearrangeMe();
                checkOffset();
            }
        }
        flowy.output = function() {
            var html_ser = canvas_div.innerHTML;
            var json_data = {
                html: html_ser,
                blockarr: blocks,
                blocks: []
            };
            if (blocks.length > 0) {
                for (var i = 0; i < blocks.length; i++) {
                    json_data.blocks.push({
                        id: blocks[i].id,
                        parent: blocks[i].parent,
                        data: [],
                        attr: []
                    });
                    var blockParent = document.querySelector(".blockid[value='" + blocks[i].id + "']").parentNode;
                    blockParent.querySelectorAll("input").forEach(function(block) {
                        var json_name = block.getAttribute("name");
                        var json_value = block.value;
                        json_data.blocks[i].data.push({
                            name: json_name,
                            value: json_value
                        });
                    });
                    Array.prototype.slice.call(blockParent.attributes).forEach(function(attribute) {
                        var jsonobj = {};
                        jsonobj[attribute.name] = attribute.value;
                        json_data.blocks[i].attr.push(jsonobj);
                    });
                }
                return json_data;
            }
        }
        flowy.deleteBlocks = function() {
            blocks = [];
            canvas_div.innerHTML = "<div class='indicator invisible'></div>";
        }

        /**
         * Initializes the drag-and-drop operation when a block is grabbed.
         * This function is triggered by the `mousedown` or `touchstart` event.
         * It clones the block being dragged, sets its initial position, and activates the drag state.
         */
        flowy.beginDrag = function(event) {
            // 1. Setup canvas position references
            if (window.getComputedStyle(canvas_div).position == "absolute" || window.getComputedStyle(canvas_div).position == "fixed") {
                absx = canvas_div.getBoundingClientRect().left;
                absy = canvas_div.getBoundingClientRect().top;
            }
            
            // 2. Capture initial mouse/touch coordinates
            if (event.targetTouches) {
                mouse_x = event.changedTouches[0].clientX;
                mouse_y = event.changedTouches[0].clientY;
            } else {
                mouse_x = event.clientX;
                mouse_y = event.clientY;
            }
            
            // 3. Check if the user is dragging a valid block (not right-click and has create-flowy class)
            if (event.which != 3 && event.target.closest(".create-flowy")) {
                // 4. Store the original element and clone it
                original = event.target.closest(".create-flowy");
                var newNode = event.target.closest(".create-flowy").cloneNode(true);
                
                // 5. Add visual feedback to original element
                event.target.closest(".create-flowy").classList.add("dragnow");
                
                // 6. Setup the cloned node with proper classes
                newNode.classList.add("block");
                newNode.classList.remove("create-flowy");
                
                // 7. Add a unique ID to the block
                if (blocks.length === 0) {
                    // If this is the first block, ID = 0
                    newNode.innerHTML += "<input type='hidden' name='blockid' class='blockid' value='" + blocks.length + "'>";
                    document.body.appendChild(newNode);
                    drag = document.querySelector(".blockid[value='" + blocks.length + "']").parentNode;
                } else {
                    // If blocks already exist, ID = max ID + 1
                    newNode.innerHTML += "<input type='hidden' name='blockid' class='blockid' value='" + (Math.max.apply(Math, blocks.map(a => a.id)) + 1) + "'>";
                    document.body.appendChild(newNode);
                    drag = document.querySelector(".blockid[value='" + (parseInt(Math.max.apply(Math, blocks.map(a => a.id))) + 1) + "']").parentNode;
                }
                
                // 8. Trigger the grab callback to notify external code
                blockGrabbed(event.target.closest(".create-flowy"));
                
                // 9. Add visual feedback for dragging
                drag.classList.add("dragging");
                
                // 10. Set active flag to indicate dragging is in progress
                active = true;
                
                // 11. Calculate drag offsets (where the user clicked within the block)
                dragx = mouse_x - (event.target.closest(".create-flowy").getBoundingClientRect().left);
                dragy = mouse_y - (event.target.closest(".create-flowy").getBoundingClientRect().top);
                
                // 12. Position the dragged element at the cursor location, accounting for the offset
                drag.style.left = mouse_x - dragx + "px";
                drag.style.top = mouse_y - dragy + "px";
            }
        }

        /**
         * Finalizes the drag-and-drop operation when a block is released.
         * This function is triggered by the `mouseup` or `touchend` event.
         * It determines whether the block should be added to the canvas, rearranged, or removed.
         */
        flowy.endDrag = function(event) {
            if (event.which != 3 && (active || rearrange)) {
                dragblock = false;
                blockReleased(); // Trigger the release callback function

                // Hide the indicator if it is visible
                if (!document.querySelector(".indicator").classList.contains("invisible")) {
                    document.querySelector(".indicator").classList.add("invisible");
                }

                // If a block is actively being dragged
                if (active) {
                    original.classList.remove("dragnow"); // Remove the "dragnow" class from the original block
                    drag.classList.remove("dragging"); // Remove the "dragging" class from the dragged block
                }

                // If the dragged block is the root block (id = 0) and rearranging
                if (parseInt(drag.querySelector(".blockid").value) === 0 && rearrange) {
                    firstBlock("rearrange"); // Handle rearranging the root block
                } 
                // If the dragged block is active, there are no blocks on the canvas, and it is dropped within the canvas
                else if (active && blocks.length == 0 && 
                         (drag.getBoundingClientRect().top + window.scrollY) > (canvas_div.getBoundingClientRect().top + window.scrollY) && 
                         (drag.getBoundingClientRect().left + window.scrollX) > (canvas_div.getBoundingClientRect().left + window.scrollX)) {
                    firstBlock("drop"); // Add the block as the first block
                } 
                // If the dragged block is active but dropped outside the canvas and there are no blocks
                else if (active && blocks.length == 0) {
                    removeSelection(); // Remove the dragged block
                } 
                // If the dragged block is active and there are existing blocks
                else if (active) {
                    var blockIds = blocks.map(a => a.id); // Get all block IDs
                    for (var i = 0; i < blocks.length; i++) {
                        // Check if the dragged block can attach to the current block
                        if (checkAttach(blockIds[i])) {
                            active = false;
                            // Attempt to snap the block to the current block
                            if (blockSnap(drag, false, document.querySelector(".blockid[value='" + blockIds[i] + "']").parentNode)) {
                                snap(drag, i, blockIds); // Snap the block into position
                            } else {
                                active = false;
                                removeSelection(); // Remove the dragged block if snapping fails
                            }
                            break;
                        } 
                        // If no valid attachment is found after checking all blocks
                        else if (i == blocks.length - 1) {
                            active = false;
                            removeSelection(); // Remove the dragged block
                        }
                    }
                } 
                // If rearranging an existing block
                else if (rearrange) {
                    var blockIds = blocks.map(a => a.id); // Get all block IDs
                    for (var i = 0; i < blocks.length; i++) {
                        // Check if the dragged block can attach to the current block
                        if (checkAttach(blockIds[i])) {
                            active = false;
                            drag.classList.remove("dragging"); // Remove the "dragging" class
                            snap(drag, i, blockIds); // Snap the block into position
                            break;
                        } 
                        // If no valid attachment is found after checking all blocks
                        else if (i == blocks.length - 1) {
                            // Check if the block should be deleted or snapped back to its previous position
                            if (beforeDelete(drag, blocks.filter(id => id.id == blockIds[i])[0])) {
                                active = false;
                                drag.classList.remove("dragging"); // Remove the "dragging" class
                                snap(drag, blockIds.indexOf(prevblock), blockIds); // Snap the block back to its previous position
                                break;
                            } else {
                                rearrange = false;
                                blockstemp = []; // Clear the temporary blocks array
                                active = false;
                                removeSelection(); // Remove the dragged block
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        /**
         * Handles the movement of a block during a drag-and-drop operation.
         * This function is triggered by the `mousemove` or `touchmove` event.
         * It updates the position of the dragged block and checks for valid attachment points.
         */
        flowy.moveBlock = function(event) {
            // Check if event comes from touch device or mouse and get appropriate coordinates
            if (event.targetTouches) {
                // For touch devices: get coordinates from the first touch point
                mouse_x = event.targetTouches[0].clientX;
                mouse_y = event.targetTouches[0].clientY;
            } else {
                // For mouse devices: get coordinates directly from the mouse position
                mouse_x = event.clientX;
                mouse_y = event.clientY;
            }
            
            // This conditional handles the initial setup when an existing block starts being dragged
            // dragblock is set to true in touchblock() when a user clicks on an existing block
            if (dragblock) {
                // Set rearrange flag to indicate we're moving an existing block (not creating a new one)
                rearrange = true;
                
                // Add visual feedback by adding the dragging class to the element
                drag.classList.add("dragging");
                
                // Get the unique ID of the dragged block
                var blockid = parseInt(drag.querySelector(".blockid").value);
                
                // Store the parent ID of the dragged block for potential snap-back operation
                prevblock = blocks.filter(a => a.id == blockid)[0].parent;
                
                // Save the dragged block's data to temporary storage (blockstemp)
                blockstemp.push(blocks.filter(a => a.id == blockid)[0]);
                
                // Remove the dragged block from the main blocks array
                blocks = blocks.filter(function(e) {
                    return e.id != blockid
                });
                
                // If this is not the root block (id != 0), remove its connecting arrow
                if (blockid != 0) {
                    document.querySelector(".arrowid[value='" + blockid + "']").parentNode.remove();
                }
                var layer = blocks.filter(a => a.parent == blockid);
                var flag = false;
                var foundids = [];
                var allids = [];
                while (!flag) {
                    for (var i = 0; i < layer.length; i++) {
                        if (layer[i] != blockid) {
                            blockstemp.push(blocks.filter(a => a.id == layer[i].id)[0]);
                            const blockParent = document.querySelector(".blockid[value='" + layer[i].id + "']").parentNode;
                            const arrowParent = document.querySelector(".arrowid[value='" + layer[i].id + "']").parentNode;
                            blockParent.style.left = (blockParent.getBoundingClientRect().left + window.scrollX) - (drag.getBoundingClientRect().left + window.scrollX) + "px";
                            blockParent.style.top = (blockParent.getBoundingClientRect().top + window.scrollY) - (drag.getBoundingClientRect().top + window.scrollY) + "px";
                            arrowParent.style.left = (arrowParent.getBoundingClientRect().left + window.scrollX) - (drag.getBoundingClientRect().left + window.scrollX) + "px";
                            arrowParent.style.top = (arrowParent.getBoundingClientRect().top + window.scrollY) - (drag.getBoundingClientRect().top + window.scrollY) + "px";
                            drag.appendChild(blockParent);
                            drag.appendChild(arrowParent);
                            foundids.push(layer[i].id);
                            allids.push(layer[i].id);
                        }
                    }
                    if (foundids.length == 0) {
                        flag = true;
                    } else {
                        layer = blocks.filter(a => foundids.includes(a.parent));
                        foundids = [];
                    }
                }
                for (var i = 0; i < blocks.filter(a => a.parent == blockid).length; i++) {
                    var blocknumber = blocks.filter(a => a.parent == blockid)[i];
                    blocks = blocks.filter(function(e) {
                        return e.id != blocknumber
                    });
                }
                for (var i = 0; i < allids.length; i++) {
                    var blocknumber = allids[i];
                    blocks = blocks.filter(function(e) {
                        return e.id != blocknumber
                    });
                }
                if (blocks.length > 1) {
                    rearrangeMe();
                }
                dragblock = false;
            }
            
            // This conditional handles the active dragging of a new block from the palette
            if (active) {
                // Update the block's position relative to the mouse position
                drag.style.left = mouse_x - dragx + "px";
                drag.style.top = mouse_y - dragy + "px";
            } 
            // This conditional handles the dragging of an existing block (rearranging)
            else if (rearrange) {
                // Update the block's position relative to the canvas, accounting for scrolling
                drag.style.left = mouse_x - dragx - (window.scrollX + absx) + canvas_div.scrollLeft + "px";
                drag.style.top = mouse_y - dragy - (window.scrollY + absy) + canvas_div.scrollTop + "px";
                
                // Update the coordinates in the temporary blocks array
                blockstemp.filter(a => a.id == parseInt(drag.querySelector(".blockid").value)).x = 
                    (drag.getBoundingClientRect().left + window.scrollX) + 
                    (parseInt(window.getComputedStyle(drag).width) / 2) + canvas_div.scrollLeft;
                
                blockstemp.filter(a => a.id == parseInt(drag.querySelector(".blockid").value)).y = 
                    (drag.getBoundingClientRect().top + window.scrollY) + 
                    (parseInt(window.getComputedStyle(drag).height) / 2) + canvas_div.scrollTop;
            }
            
            // This conditional runs when dragging is active (either new block or rearranging)
            if (active || rearrange) {
                // This group of conditionals handles auto-scrolling when dragging near canvas edges
                
                // Auto-scroll right when dragging near the right edge of the canvas
                if (mouse_x > canvas_div.getBoundingClientRect().width + canvas_div.getBoundingClientRect().left - 10 && 
                    mouse_x < canvas_div.getBoundingClientRect().width + canvas_div.getBoundingClientRect().left + 10) {
                    canvas_div.scrollLeft += 10; // Scroll right
                } 
                // Auto-scroll left when dragging near the left edge of the canvas
                else if (mouse_x < canvas_div.getBoundingClientRect().left + 10 && 
                         mouse_x > canvas_div.getBoundingClientRect().left - 10) {
                    canvas_div.scrollLeft -= 10; // Scroll left
                } 
                // Auto-scroll down when dragging near the bottom edge of the canvas
                else if (mouse_y > canvas_div.getBoundingClientRect().height + canvas_div.getBoundingClientRect().top - 10 && 
                         mouse_y < canvas_div.getBoundingClientRect().height + canvas_div.getBoundingClientRect().top + 10) {
                    canvas_div.scrollTop += 10; // Scroll down
                } 
                // Auto-scroll up when dragging near the top edge of the canvas
                else if (mouse_y < canvas_div.getBoundingClientRect().top + 10 && 
                         mouse_y > canvas_div.getBoundingClientRect().top - 10) {
                    canvas_div.scrollLeft -= 10; // Scroll up (should be scrollTop -= 10, this appears to be a bug)
                }
                
                // Calculate the current position of the dragged block relative to the canvas
                var xpos = (drag.getBoundingClientRect().left + window.scrollX) + 
                           (parseInt(window.getComputedStyle(drag).width) / 2) + 
                           canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left;
                           
                var ypos = (drag.getBoundingClientRect().top + window.scrollY) + 
                           canvas_div.scrollTop - canvas_div.getBoundingClientRect().top;
                
                // Get all block IDs for iteration
                var blockIds = blocks.map(a => a.id);
                
                // Loop through all blocks to check for potential attachment points
                for (var i = 0; i < blocks.length; i++) {
                    // If the dragged block can attach to this block, show the attachment indicator
                    if (checkAttach(blockIds[i])) {
                        // Move the indicator to the potential attachment point
                        document.querySelector(".blockid[value='" + blockIds[i] + "']").parentNode.appendChild(document.querySelector(".indicator"));
                        document.querySelector(".indicator").style.left = (document.querySelector(".blockid[value='" + blockIds[i] + "']").parentNode.offsetWidth / 2) - 5 + "px";
                        document.querySelector(".indicator").style.top = document.querySelector(".blockid[value='" + blockIds[i] + "']").parentNode.offsetHeight + "px";
                        document.querySelector(".indicator").classList.remove("invisible");
                        break;
                    } 
                    // If this is the last block and no attachment point was found, hide the indicator
                    else if (i == blocks.length - 1) {
                        if (!document.querySelector(".indicator").classList.contains("invisible")) {
                            document.querySelector(".indicator").classList.add("invisible");
                        }
                    }
                }
            }
        }

        /**
         * Checks if an element or its parent has a specific class.
         * This function is used to determine if an event target belongs to a block.
         * 
         * @param {HTMLElement} element - The element to check.
         * @param {string} classname - The class name to look for.
         * @returns {boolean} - True if the class is found, otherwise false.
         */
        function hasParentClass(element, classname) {
            if (element.className) {
                if (element.className.split(' ').indexOf(classname) >= 0) return true;
            }
            return element.parentNode && hasParentClass(element.parentNode, classname);
        }

        /**
         * Handles the logic for touching a block (e.g., selecting or dragging it).
         * This function is triggered by `mousedown`, `mouseup`, or `touchstart` events.
         * It determines whether a block is being dragged or selected.
         */
        function touchblock(event) {
            dragblock = false;
            if (hasParentClass(event.target, "block")) {
                var theblock = event.target.closest(".block");
                if (event.targetTouches) {
                    mouse_x = event.targetTouches[0].clientX;
                    mouse_y = event.targetTouches[0].clientY;
                } else {
                    mouse_x = event.clientX;
                    mouse_y = event.clientY;
                }
                if (event.type !== "mouseup" && hasParentClass(event.target, "block")) {
                    if (event.which != 3) {
                        if (!active && !rearrange) {
                            dragblock = true;
                            drag = theblock;
                            dragx = mouse_x - (drag.getBoundingClientRect().left + window.scrollX);
                            dragy = mouse_y - (drag.getBoundingClientRect().top + window.scrollY);
                        }
                    }
                }
            }
        }

        /**
         * Handles the logic for snapping a dragged block to a parent block.
         * This function is called during the `endDrag` operation when a block is dropped onto a valid parent.
         * It calculates the alignment of the dragged block and updates the positions of child blocks and arrows.
         * 
         * @param {HTMLElement} drag - The dragged block element.
         * @param {number} i - The index of the parent block in the `blocks` array.
         * @param {Array} blockIds - The list of block IDs.
         */
        function snap(drag, i, blockIds) {
            // If not rearranging, append the dragged block to the canvas
            if (!rearrange) {canvas_div.appendChild(drag)}

            var totalwidth = 0; // Total width of all child blocks
            var totalremove = 0; // Tracks the cumulative width removed for alignment
            var maxheight = 0; // Tracks the maximum height of child blocks (not used here but could be extended)

            // Calculate the total width of all child blocks of the parent block
            for (var w = 0; w < blocks.filter(id => id.parent == blockIds[i]).length; w++) {
            var child = blocks.filter(id => id.parent == blockIds[i])[w];
            if (child.childwidth > child.width) {
                totalwidth += child.childwidth + paddingx; // Add child width + padding
            } else {
                totalwidth += child.width + paddingx; // Add block width + padding
            }
            }

            // Add the width of the dragged block to the total width
            totalwidth += parseInt(window.getComputedStyle(drag).width);

            // Align child blocks under the parent block
            for (var w = 0; w < blocks.filter(id => id.parent == blockIds[i]).length; w++) {
            var child = blocks.filter(id => id.parent == blockIds[i])[w];
            if (child.childwidth > child.width) {
                // Position the child block based on its child width
                document.querySelector(".blockid[value='" + child.id + "']").parentNode.style.left = blocks.filter(a => a.id == blockIds[i])[0].x - (totalwidth / 2) + totalremove + (child.childwidth / 2) - (child.width / 2) + "px";
                child.x = blocks.filter(id => id.parent == blockIds[i])[0].x - (totalwidth / 2) + totalremove + (child.childwidth / 2);
                totalremove += child.childwidth + paddingx; // Update the cumulative width
            } else {
                // Position the child block based on its block width
                document.querySelector(".blockid[value='" + child.id + "']").parentNode.style.left = blocks.filter(a => a.id == blockIds[i])[0].x - (totalwidth / 2) + totalremove + "px";
                child.x = blocks.filter(id => id.parent == blockIds[i])[0].x - (totalwidth / 2) + totalremove + (child.width / 2);
                totalremove += child.width + paddingx; // Update the cumulative width
            }
            }

            // Position the dragged block under the parent block
            drag.style.left = blocks.filter(id => id.id == blockIds[i])[0].x - (totalwidth / 2) + totalremove - (window.scrollX + absx) + canvas_div.scrollLeft + canvas_div.getBoundingClientRect().left + "px";
            drag.style.top = blocks.filter(id => id.id == blockIds[i])[0].y + (blocks.filter(id => id.id == blockIds[i])[0].height / 2) + paddingy - (window.scrollY + absy) + canvas_div.getBoundingClientRect().top + "px";

            if (rearrange) {
            // Update the temporary block's position and parent
            blockstemp.filter(a => a.id == parseInt(drag.querySelector(".blockid").value))[0].x = (drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(drag).width) / 2) + canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left;
            blockstemp.filter(a => a.id == parseInt(drag.querySelector(".blockid").value))[0].y = (drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(drag).height) / 2) + canvas_div.scrollTop - canvas_div.getBoundingClientRect().top;
            blockstemp.filter(a => a.id == drag.querySelector(".blockid").value)[0].parent = blockIds[i];

            // Reposition all temporary blocks and arrows
            for (var w = 0; w < blockstemp.length; w++) {
                if (blockstemp[w].id != parseInt(drag.querySelector(".blockid").value)) {
                const blockParent = document.querySelector(".blockid[value='" + blockstemp[w].id + "']").parentNode;
                const arrowParent = document.querySelector(".arrowid[value='" + blockstemp[w].id + "']").parentNode;

                // Adjust the block's position
                blockParent.style.left = (blockParent.getBoundingClientRect().left + window.scrollX) - (window.scrollX + canvas_div.getBoundingClientRect().left) + canvas_div.scrollLeft + "px";
                blockParent.style.top = (blockParent.getBoundingClientRect().top + window.scrollY) - (window.scrollY + canvas_div.getBoundingClientRect().top) + canvas_div.scrollTop + "px";

                // Adjust the arrow's position
                arrowParent.style.left = (arrowParent.getBoundingClientRect().left + window.scrollX) - (window.scrollX + canvas_div.getBoundingClientRect().left) + canvas_div.scrollLeft + 20 + "px";
                arrowParent.style.top = (arrowParent.getBoundingClientRect().top + window.scrollY) - (window.scrollY + canvas_div.getBoundingClientRect().top) + canvas_div.scrollTop + "px";

                // Append the block and arrow back to the canvas
                canvas_div.appendChild(blockParent);
                canvas_div.appendChild(arrowParent);

                // Update the block's position in the temporary array
                blockstemp[w].x = (blockParent.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(blockParent).width) / 2) + canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left;
                blockstemp[w].y = (blockParent.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(blockParent).height) / 2) + canvas_div.scrollTop - canvas_div.getBoundingClientRect().top;
                }
            }

            // Merge temporary blocks into the main blocks array
            blocks = blocks.concat(blockstemp);
            blockstemp = [];
            } else {
            // Add the dragged block to the blocks array
            blocks.push({
                childwidth: 0,
                parent: blockIds[i],
                id: parseInt(drag.querySelector(".blockid").value),
                x: (drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(drag).width) / 2) + canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left,
                y: (drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(drag).height) / 2) + canvas_div.scrollTop - canvas_div.getBoundingClientRect().top,
                width: parseInt(window.getComputedStyle(drag).width),
                height: parseInt(window.getComputedStyle(drag).height)
            });
            }

            // Draw an arrow connecting the dragged block to its parent
            var arrowblock = blocks.filter(a => a.id == parseInt(drag.querySelector(".blockid").value))[0];
            var arrowx = arrowblock.x - blocks.filter(a => a.id == blockIds[i])[0].x + 20;
            var arrowy = paddingy;
            drawArrow(arrowblock, arrowx, arrowy, blockIds[i]);

            // Update the child width of all ancestor blocks
            if (blocks.filter(a => a.id == blockIds[i])[0].parent != -1) {
            var flag = false;
            var idval = blockIds[i];
            while (!flag) {
                if (blocks.filter(a => a.id == idval)[0].parent == -1) {
                flag = true;
                } else {
                var zwidth = 0;
                for (var w = 0; w < blocks.filter(id => id.parent == idval).length; w++) {
                    var child = blocks.filter(id => id.parent == idval)[w];
                    if (child.childwidth > child.width) {
                    if (w == blocks.filter(id => id.parent == idval).length - 1) {
                        zwidth += child.childwidth;
                    } else {
                        zwidth += child.childwidth + paddingx;
                    }
                    } else {
                    if (w == blocks.filter(id => id.parent == idval).length - 1) {
                        zwidth += child.width;
                    } else {
                        zwidth += child.width + paddingx;
                    }
                    }
                }
                blocks.filter(a => a.id == idval)[0].childwidth = zwidth;
                idval = blocks.filter(a => a.id == idval)[0].parent;
                }
            }
            blocks.filter(id => id.id == idval)[0].childwidth = totalwidth;
            }

            // Finalize rearrangement if applicable
            if (rearrange) {
            rearrange = false;
            drag.classList.remove("dragging");
            }

            // Rearrange all blocks and check for canvas offset
            rearrangeMe();
            checkOffset();
        }

        /**
         * Draws an arrow connecting a child block to its parent block.
         * This function is called during the `snap` operation to visually link blocks.
         * 
         * @param {Object} arrow - The child block object.
         * @param {number} x - The x-coordinate of the arrow.
         * @param {number} y - The y-coordinate of the arrow.
         * @param {number} id - The ID of the parent block.
         */
        function drawArrow(arrow, x, y, id) {
            if (x < 0) {
                canvas_div.innerHTML += '<div class="arrowblock"><input type="hidden" class="arrowid" value="' + drag.querySelector(".blockid").value + '"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M' + (blocks.filter(a => a.id == id)[0].x - arrow.x + 5) + ' 0L' + (blocks.filter(a => a.id == id)[0].x - arrow.x + 5) + ' ' + (paddingy / 2) + 'L5 ' + (paddingy / 2) + 'L5 ' + y + '" stroke="#C5CCD0" stroke-width="2px"/><path d="M0 ' + (y - 5) + 'H10L5 ' + y + 'L0 ' + (y - 5) + 'Z" fill="#C5CCD0"/></svg></div>';
                document.querySelector('.arrowid[value="' + drag.querySelector(".blockid").value + '"]').parentNode.style.left = (arrow.x - 5) - (absx + window.scrollX) + canvas_div.scrollLeft + canvas_div.getBoundingClientRect().left + "px";
            } else {
                canvas_div.innerHTML += '<div class="arrowblock"><input type="hidden" class="arrowid" value="' + drag.querySelector(".blockid").value + '"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 0L20 ' + (paddingy / 2) + 'L' + (x) + ' ' + (paddingy / 2) + 'L' + x + ' ' + y + '" stroke="#C5CCD0" stroke-width="2px"/><path d="M' + (x - 5) + ' ' + (y - 5) + 'H' + (x + 5) + 'L' + x + ' ' + y + 'L' + (x - 5) + ' ' + (y - 5) + 'Z" fill="#C5CCD0"/></svg></div>';
                document.querySelector('.arrowid[value="' + parseInt(drag.querySelector(".blockid").value) + '"]').parentNode.style.left = blocks.filter(a => a.id == id)[0].x - 20 - (absx + window.scrollX) + canvas_div.scrollLeft + canvas_div.getBoundingClientRect().left + "px";
            }
            document.querySelector('.arrowid[value="' + parseInt(drag.querySelector(".blockid").value) + '"]').parentNode.style.top = blocks.filter(a => a.id == id)[0].y + (blocks.filter(a => a.id == id)[0].height / 2) + canvas_div.getBoundingClientRect().top - absy + "px";
        }

        /**
         * Updates the position and appearance of an arrow connecting a child block to its parent.
         * This function is called during rearrangement or snapping operations.
         * 
         * @param {Object} arrow - The child block object.
         * @param {number} x - The x-coordinate of the arrow.
         * @param {number} y - The y-coordinate of the arrow.
         * @param {Object} child - The child block object.
         */
        function updateArrow(arrow, x, y, child) { 
            if (x < 0) {
                document.querySelector('.arrowid[value="' + child.id + '"]').parentNode.style.left = (arrow.x - 5) - (absx + window.scrollX) + canvas_div.getBoundingClientRect().left + "px";
                document.querySelector('.arrowid[value="' + child.id + '"]').parentNode.innerHTML = '<input type="hidden" class="arrowid" value="' + child.id + '"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M' + (blocks.filter(id => id.id == child.parent)[0].x - arrow.x + 5) + ' 0L' + (blocks.filter(id => id.id == child.parent)[0].x - arrow.x + 5) + ' ' + (paddingy / 2) + 'L5 ' + (paddingy / 2) + 'L5 ' + y + '" stroke="#C5CCD0" stroke-width="2px"/><path d="M0 ' + (y - 5) + 'H10L5 ' + y + 'L0 ' + (y - 5) + 'Z" fill="#C5CCD0"/></svg>';
            } else {
                document.querySelector('.arrowid[value="' + child.id + '"]').parentNode.style.left = blocks.filter(id => id.id == child.parent)[0].x - 20 - (absx + window.scrollX) + canvas_div.getBoundingClientRect().left + "px";
                document.querySelector('.arrowid[value="' + child.id + '"]').parentNode.innerHTML = '<input type="hidden" class="arrowid" value="' + child.id + '"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 0L20 ' + (paddingy / 2) + 'L' + (x) + ' ' + (paddingy / 2) + 'L' + x + ' ' + y + '" stroke="#C5CCD0" stroke-width="2px"/><path d="M' + (x - 5) + ' ' + (y - 5) + 'H' + (x + 5) + 'L' + x + ' ' + y + 'L' + (x - 5) + ' ' + (y - 5) + 'Z" fill="#C5CCD0"/></svg>';
            }
        }

        /**
         * Handles the logic for adding the first block to the canvas or rearranging the first block.
         * This function is called during the `endDrag` operation when the first block is dropped or rearranged.
         * 
         * @param {string} type - The type of action, either "drop" or "rearrange".
         */
        function firstBlock(type) {
            if (type == "drop") {
                // Snap the block to the grid and deactivate dragging
                blockSnap(drag, true, undefined);
                active = false;

                // Adjust the block's position relative to the canvas
                drag.style.top = (drag.getBoundingClientRect().top + window.scrollY) - (absy + window.scrollY) + canvas_div.scrollTop + "px";
                drag.style.left = (drag.getBoundingClientRect().left + window.scrollX) - (absx + window.scrollX) + canvas_div.scrollLeft + "px";

                // Append the block to the canvas
                canvas_div.appendChild(drag);

                // Add the block to the blocks array with its properties
                blocks.push({
                    parent: -1, // Indicates this block has no parent (it's the root block)
                    childwidth: 0, // No child blocks yet
                    id: parseInt(drag.querySelector(".blockid").value), // Unique ID of the block
                    x: (drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(drag).width) / 2) + canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left,
                    y: (drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(drag).height) / 2) + canvas_div.scrollTop - canvas_div.getBoundingClientRect().top,
                    width: parseInt(window.getComputedStyle(drag).width), // Width of the block
                    height: parseInt(window.getComputedStyle(drag).height) // Height of the block
                });
            } else if (type == "rearrange") {
                // Remove the dragging class and deactivate rearrangement
                drag.classList.remove("dragging");
                rearrange = false;

                // Iterate through temporary blocks to reposition them
                for (var w = 0; w < blockstemp.length; w++) {
                    if (blockstemp[w].id != parseInt(drag.querySelector(".blockid").value)) {
                        // Get the parent block and arrow elements
                        const blockParent = document.querySelector(".blockid[value='" + blockstemp[w].id + "']").parentNode;
                        const arrowParent = document.querySelector(".arrowid[value='" + blockstemp[w].id + "']").parentNode;

                        // Get the current positions of the block and arrow
                        const blockRect = blockParent.getBoundingClientRect();
                        const arrowRect = arrowParent.getBoundingClientRect();

                        // Adjust the block's position relative to the canvas
                        blockParent.style.left = (blockRect.left + window.scrollX) - (window.scrollX) + canvas_div.scrollLeft - 1 - absx + "px";
                        blockParent.style.top = (blockRect.top + window.scrollY) - (window.scrollY) + canvas_div.scrollTop - absy - 1 + "px";

                        // Adjust the arrow's position relative to the canvas
                        arrowParent.style.left = (arrowRect.left + window.scrollX) - (window.scrollX) + canvas_div.scrollLeft - absx - 1 + "px";
                        arrowParent.style.top = (arrowRect.top + window.scrollY) + canvas_div.scrollTop - 1 - absy + "px";

                        // Append the block and arrow back to the canvas
                        canvas_div.appendChild(blockParent);
                        canvas_div.appendChild(arrowParent);

                        // Update the block's position in the temporary array
                        blockstemp[w].x = (blockRect.left + window.scrollX) + (parseInt(blockParent.offsetWidth) / 2) + canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left - 1;
                        blockstemp[w].y = (blockRect.top + window.scrollY) + (parseInt(blockParent.offsetHeight) / 2) + canvas_div.scrollTop - canvas_div.getBoundingClientRect().top - 1;
                    }
                }

                // Update the position of the dragged block in the temporary array
                blockstemp.filter(a => a.id == 0)[0].x = (drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(drag).width) / 2) + canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left;
                blockstemp.filter(a => a.id == 0)[0].y = (drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(drag).height) / 2) + canvas_div.scrollTop - canvas_div.getBoundingClientRect().top;

                // Merge the temporary blocks into the main blocks array
                blocks = blocks.concat(blockstemp);
                blockstemp = [];
            }
        }
        
        /**
         * Checks if a dragged block can attach to a specific parent block.
         * This function is called during the `moveBlock` and `endDrag` operations.
         * 
         * @param {number} id - The ID of the parent block to check.
         * @returns {boolean} - True if the block can attach, otherwise false.
         */
        function checkAttach(id) {
            const xpos = (drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(drag).width) / 2) + canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left;
            const ypos = (drag.getBoundingClientRect().top + window.scrollY) + canvas_div.scrollTop - canvas_div.getBoundingClientRect().top;
            if (xpos >= blocks.filter(a => a.id == id)[0].x - (blocks.filter(a => a.id == id)[0].width / 2) - paddingx && xpos <= blocks.filter(a => a.id == id)[0].x + (blocks.filter(a => a.id == id)[0].width / 2) + paddingx && ypos >= blocks.filter(a => a.id == id)[0].y - (blocks.filter(a => a.id == id)[0].height / 2) && ypos <= blocks.filter(a => a.id == id)[0].y + blocks.filter(a => a.id == id)[0].height) {
                return true;   
            } else {
                return false;
            }
        }
        
        /**
         * Removes the dragged block from the canvas.
         * This function is called when a block is dropped outside the canvas or cannot attach to a parent.
         */
        function removeSelection() {
            canvas_div.appendChild(document.querySelector(".indicator"));
            drag.parentNode.removeChild(drag);
        }
        
        /**
         * Adjusts the positions of all blocks and arrows to ensure proper alignment.
         * This function is called during rearrangement or snapping operations.
         */
        function rearrangeMe() {
            // Map each block's parent ID to create a list of parent-child relationships
            var parentIds = blocks.map(block => block.parent);

            // Iterate through each parent block
            for (var z = 0; z < parentIds.length; z++) {
                // Skip the root block (parent ID -1)
                if (parentIds[z] == -1) {
                    z++;
                }

                // Initialize variables to calculate total width and alignment
                var totalwidth = 0; // Total width of all child blocks
                var totalremove = 0; // Tracks the cumulative width removed for alignment
                var maxheight = 0; // Tracks the maximum height of child blocks (not used here but could be extended)

                // Iterate through all child blocks of the current parent
                for (var w = 0; w < blocks.filter(id => id.parent == parentIds[z]).length; w++) {
                    var child = blocks.filter(id => id.parent == parentIds[z])[w];

                    // If the child block has no child, set its child width to 0
                    if (blocks.filter(id => id.parent == child.id).length == 0) {
                        child.childwidth = 0;
                    }

                    // Calculate the total width of the child block, including padding
                    if (child.childwidth > child.width) {
                        if (w == blocks.filter(id => id.parent == parentIds[z]).length - 1) {
                            totalwidth += child.childwidth; // Add child width for the last block
                        } else {
                            totalwidth += child.childwidth + paddingx; // Add child width + padding
                        }
                    } else {
                        if (w == blocks.filter(id => id.parent == parentIds[z]).length - 1) {
                            totalwidth += child.width; // Add block width for the last block
                        } else {
                            totalwidth += child.width + paddingx; // Add block width + padding
                        }
                    }
                }

                // Update the parent block's child width
                if (parentIds[z] != -1) {
                    blocks.filter(a => a.id == parentIds[z])[0].childwidth = totalwidth;
                }

                // Align child blocks under the parent block
                for (var w = 0; w < blocks.filter(id => id.parent == parentIds[z]).length; w++) {
                    var child = blocks.filter(id => id.parent == parentIds[z])[w];
                    const r_block = document.querySelector(".blockid[value='" + child.id + "']").parentNode;
                    const r_array = blocks.filter(id => id.id == parentIds[z]);

                    // Set the top position of the child block relative to the parent
                    r_block.style.top = r_array.y + paddingy + canvas_div.getBoundingClientRect().top - absy + "px";
                    r_array.y = r_array.y + paddingy;

                    // Set the left position of the child block based on its width and alignment
                    if (child.childwidth > child.width) {
                        r_block.style.left = r_array[0].x - (totalwidth / 2) + totalremove + (child.childwidth / 2) - (child.width / 2) - (absx + window.scrollX) + canvas_div.getBoundingClientRect().left + "px";
                        child.x = r_array[0].x - (totalwidth / 2) + totalremove + (child.childwidth / 2);
                        totalremove += child.childwidth + paddingx;
                    } else {
                        r_block.style.left = r_array[0].x - (totalwidth / 2) + totalremove - (absx + window.scrollX) + canvas_div.getBoundingClientRect().left + "px";
                        child.x = r_array[0].x - (totalwidth / 2) + totalremove + (child.width / 2);
                        totalremove += child.width + paddingx;
                    }

                    // Update the arrow connecting the child block to its parent
                    var arrowblock = blocks.filter(a => a.id == child.id)[0];
                    var arrowx = arrowblock.x - blocks.filter(a => a.id == child.parent)[0].x + 20;
                    var arrowy = paddingy;
                    updateArrow(arrowblock, arrowx, arrowy, child);
                }
            }
        }

        /**
         * Ensures that all blocks are within the bounds of the canvas.
         * This function is called during rearrangement or snapping operations.
         */
        function checkOffset() {
            // Map the x-coordinates of all blocks
            offsetleft = blocks.map(a => a.x);

            // Map the widths of all blocks
            var widths = blocks.map(a => a.width);

            // Calculate the leftmost position of all blocks (adjusted for their widths)
            var mathmin = offsetleft.map(function(item, index) {
                return item - (widths[index] / 2);
            });
            offsetleft = Math.min.apply(Math, mathmin);

            // Edge Case: If the leftmost block is outside the canvas, adjust all blocks
            if (offsetleft < (canvas_div.getBoundingClientRect().left + window.scrollX - absx)) {
                var blockIds = blocks.map(a => a.id); // Map all block IDs
                for (var w = 0; w < blocks.length; w++) {
                    // Adjust the left position of each block
                    document.querySelector(".blockid[value='" + blocks.filter(a => a.id == blockIds[w])[0].id + "']").parentNode.style.left = blocks.filter(a => a.id == blockIds[w])[0].x - (blocks.filter(a => a.id == blockIds[w])[0].width / 2) - offsetleft + canvas_div.getBoundingClientRect().left - absx + 20 + "px";

                    // Adjust the position of arrows if the block has a parent
                    if (blocks.filter(a => a.id == blockIds[w])[0].parent != -1) {
                        var arrowblock = blocks.filter(a => a.id == blockIds[w])[0];
                        var arrowx = arrowblock.x - blocks.filter(a => a.id == blocks.filter(a => a.id == blockIds[w])[0].parent)[0].x;
                        if (arrowx < 0) {
                            document.querySelector('.arrowid[value="' + blockIds[w] + '"]').parentNode.style.left = (arrowblock.x - offsetleft + 20 - 5) + canvas_div.getBoundingClientRect().left - absx + "px";
                        } else {
                            document.querySelector('.arrowid[value="' + blockIds[w] + '"]').parentNode.style.left = blocks.filter(id => id.id == blocks.filter(a => a.id == blockIds[w])[0].parent)[0].x - 20 - offsetleft + canvas_div.getBoundingClientRect().left - absx + 20 + "px";
                        }
                    }
                }

                // Update the x-coordinates of all blocks
                for (var w = 0; w < blocks.length; w++) {
                    blocks[w].x = (document.querySelector(".blockid[value='" + blocks[w].id + "']").parentNode.getBoundingClientRect().left + window.scrollX) + (canvas_div.scrollLeft) + (parseInt(window.getComputedStyle(document.querySelector(".blockid[value='" + blocks[w].id + "']").parentNode).width) / 2) - 20 - canvas_div.getBoundingClientRect().left;
                }
            }
        }
        
        document.addEventListener("mousedown", flowy.beginDrag);
        document.addEventListener("mousedown", touchblock, false);
        document.addEventListener("touchstart", flowy.beginDrag);
        document.addEventListener("touchstart", touchblock, false);

        document.addEventListener("mouseup", touchblock, false);
        document.addEventListener("mousemove", flowy.moveBlock, false);
        document.addEventListener("touchmove", flowy.moveBlock, false);

        document.addEventListener("mouseup", flowy.endDrag, false);
        document.addEventListener("touchend", flowy.endDrag, false);
    }

    /**
     * Triggers the `grab` callback when a block is grabbed.
     * This function is called during the `beginDrag` operation.
     * 
     * @param {HTMLElement} block - The block element being grabbed.
     */
    function blockGrabbed(block) {
        grab(block);
    }

    /**
     * Triggers the `release` callback when a block is released.
     * This function is called during the `endDrag` operation.
     */
    function blockReleased() {
        release();
    }

    /**
     * Triggers the `snapping` callback to determine if a block can snap to a parent.
     * This function is called during the `snap` operation.
     * 
     * @param {HTMLElement} drag - The dragged block element.
     * @param {boolean} first - Whether this is the first block being added.
     * @param {HTMLElement} parent - The parent block element.
     * @returns {boolean} - True if the block can snap, otherwise false.
     */
    function blockSnap(drag, first, parent) {
        return snapping(drag, first, parent);
    }

    /**
     * Triggers the `rearrange` callback to determine if a block can be rearranged.
     * This function is called during the `endDrag` operation when rearranging blocks.
     * 
     * @param {HTMLElement} drag - The dragged block element.
     * @param {Object} parent - The parent block object.
     * @returns {boolean} - True if the block can be rearranged, otherwise false.
     */
    function beforeDelete(drag, parent) {
        return rearrange(drag, parent);
    }

    /**
     * Adds an event listener to multiple elements matching a selector.
     * This function is used to attach event listeners to dynamically created elements.
     * 
     * @param {string} type - The event type (e.g., "click").
     * @param {Function} listener - The event listener function.
     * @param {boolean} capture - Whether to use capture mode.
     * @param {string} selector - The CSS selector for the elements.
     */
    function addEventListenerMulti(type, listener, capture, selector) {
        var nodes = document.querySelectorAll(selector);
        for (var i = 0; i < nodes.length; i++) {
            nodes[i].addEventListener(type, listener, capture);
        }
    }

    /**
     * Removes an event listener from multiple elements matching a selector.
     * This function is used to detach event listeners from dynamically created elements.
     * 
     * @param {string} type - The event type (e.g., "click").
     * @param {Function} listener - The event listener function.
     * @param {boolean} capture - Whether to use capture mode.
     * @param {string} selector - The CSS selector for the elements.
     */
    function removeEventListenerMulti(type, listener, capture, selector) {
        var nodes = document.querySelectorAll(selector);
        for (var i = 0; i < nodes.length; i++) {
            nodes[i].removeEventListener(type, listener, capture);
        }
    }
    
    flowy.load();
}