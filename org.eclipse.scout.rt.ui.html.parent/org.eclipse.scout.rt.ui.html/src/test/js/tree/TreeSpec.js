describe("Tree", function() {
  var session;

  beforeEach(function() {
    setFixtures(sandbox());
    session = new scout.Session($('#sandbox'), '1.1');
    jasmine.Ajax.install();
    jasmine.clock().install();
  });

  afterEach(function() {
    session = null;
    jasmine.Ajax.uninstall();
    jasmine.clock().uninstall();
  });

  function createModelFixture(nodeCount, depth, expanded) {
    return createModel(createUniqueAdapterId(), createModelNodes(nodeCount, depth, expanded));
  }

  function createModel(id, nodes) {
    var model = {
      "id": id,
    };

    if (nodes) {
      model.nodes = nodes;
    }

    return model;
  }

  function createModelNode(id, text) {
    return {
      "id": id,
      "text": text
    };
  }

  function createModelNodes(nodeCount, depth, expanded) {
    return createModelNodesInternal(nodeCount, depth, expanded);
  }

  function createModelNodesInternal(nodeCount, depth, expanded, parentNode) {
    if (!nodeCount) {
      return;
    }

    var nodes = [],
      nodeId;
    if (!depth) {
      depth = 0;
    }
    for (var i = 0; i < nodeCount; i++) {
      nodeId = i;
      if (parentNode) {
        nodeId = parentNode.id + '_' + nodeId;
      }
      nodes[i] = createModelNode(nodeId, 'node ' + i);
      nodes[i].expanded = expanded;
      if (depth > 0) {
        nodes[i].childNodes = createModelNodesInternal(nodeCount, depth - 1, expanded, nodes[i]);
      }
    }
    return nodes;
  }

  function createTree(model) {
    var tree = new scout.Tree();
    tree.init(model, session);
    return tree;
  }

  function findAllNodes(tree) {
    return tree._$viewport.find('.tree-item');
  }

  describe("creation", function() {
    it("adds nodes", function() {

      var model = createModelFixture(1);
      var tree = createTree(model);
      tree.render(session.$entryPoint);

      expect(findAllNodes(tree).length).toBe(1);
    });

    it("does not add notes if no nodes are provided", function() {

      var model = createModelFixture();
      var tree = createTree(model);
      tree.render(session.$entryPoint);

      expect(findAllNodes(tree).length).toBe(0);
    });
  });

  describe("node click", function() {

    it("calls tree._onNodeClick", function() {
      var model = createModelFixture(1);
      var tree = createTree(model);
      spyOn(tree, '_onNodeClick');
      tree.render(session.$entryPoint);

      var $node = tree._$viewport.find('.tree-item:first');
      $node.click();

      expect(tree._onNodeClick).toHaveBeenCalled();
    });

    it("sends click and selection events in one call in this order", function() {
      var model = createModelFixture(1);
      var tree = createTree(model);
      tree.render(session.$entryPoint);

      var $node = tree._$viewport.find('.tree-item:first');
      $node.triggerClick();

      sendQueuedAjaxCalls();
      expect(jasmine.Ajax.requests.count()).toBe(1);

      var requestData = mostRecentJsonRequest();
      expect(requestData).toContainEventTypesExactly(['nodeClicked', 'nodesSelected']);
    });

    it("updates model (selection)", function() {
      var model = createModelFixture(1);
      var tree = createTree(model);
      tree.render(session.$entryPoint);

      expect(tree.selectedNodeIds.length).toBe(0);

      var $node = tree._$viewport.find('.tree-item:first');
      $node.triggerClick();

      expect(tree.selectedNodeIds.length).toBe(1);
      expect(tree.selectedNodeIds[0]).toBe(model.nodes[0].id);
    });
  });

  describe("node double click", function() {

    beforeEach(function() {
      //Expansion happens with an animation (async).
      //Disabling it makes it possible to test the expansion state after the expansion
      $.fx.off = true;
    });

    afterEach(function() {
      $.fx.off = false;
    });

    it("expands/collapses the node", function() {
      var model = createModelFixture(1, 1, false);
      var tree = createTree(model);
      tree.render(session.$entryPoint);

      var $node = tree._$viewport.find('.tree-item:first');
      expect($node).not.toHaveClass('expanded');

      $node.triggerDoubleClick();
      expect($node).toHaveClass('expanded');

      $node.triggerDoubleClick();
      expect($node).not.toHaveClass('expanded');
    });

    it("sends clicked, selection, action and expansion events", function() {
      var model = createModelFixture(1, 1, false);
      var tree = createTree(model);
      tree.render(session.$entryPoint);

      var $node = tree._$viewport.find('.tree-item:first');
      $node.triggerDoubleClick();

      sendQueuedAjaxCalls();

      expect(mostRecentJsonRequest()).toContainEventTypesExactly(['nodeClicked', 'nodesSelected', 'nodeAction', 'nodeExpanded']);
    });
  });

  describe("node control double click", function() {

    beforeEach(function() {
      //Expansion happens with an animation (async).
      //Disabling it makes it possible to test the expansion state after the expansion
      $.fx.off = true;
    });

    afterEach(function() {
      $.fx.off = false;
    });

    it("does the same as control single click (does NOT expand and immediately collapse again)", function() {
      var model = createModelFixture(1, 1, false);
      var tree = createTree(model);
      tree.render(session.$entryPoint);

      var $nodeControl = tree._$viewport.find('.tree-item-control:first');
      var $node = $nodeControl.parent();
      expect($node).not.toHaveClass('expanded');

      $nodeControl.triggerDoubleClick();
      expect($node).toHaveClass('expanded');

      $nodeControl.triggerDoubleClick();
      expect($node).not.toHaveClass('expanded');
    });

    it("sends clicked, selection, action and expansion events", function() {
      var model = createModelFixture(1, 1, false);
      var tree = createTree(model);
      tree.render(session.$entryPoint);

      var $node = tree._$viewport.find('.tree-item:first');
      $node.triggerDoubleClick();

      sendQueuedAjaxCalls();

      expect(mostRecentJsonRequest()).toContainEventTypesExactly(['nodeClicked', 'nodesSelected', 'nodeAction', 'nodeExpanded']);
    });
  });

  describe("collapseAll", function() {

    it("collapses all nodes and updates model", function() {
      var i;
      var model = createModelFixture(3, 2, true);
      var tree = createTree(model);
      tree.render(session.$entryPoint);

      var allNodes = [];
      tree._visitNodes(tree.nodes, function(parentNode, node) {
        allNodes.push(node);
      });

      for (i=0; i < allNodes.length; i++) {
        expect(allNodes[i].expanded).toBe(true);
      }

      tree.collapseAll();

      for (i=0; i < allNodes.length; i++) {
        expect(allNodes[i].expanded).toBe(false);
      }

      //A nodeExpanded event must be sent for every node because all nodes were initially expanded
      sendQueuedAjaxCalls();
      expect(mostRecentJsonRequest().events.length).toBe(allNodes.length);
    });
  });

  describe("clearSelection", function() {

    it("clears the selection", function() {
      var model = createModelFixture(1, 1);
      var node0 = model.nodes[0];
      model.selectedNodeIds = [node0.id];

      var tree = createTree(model);
      tree.render(session.$entryPoint);
      expect(tree._findSelectedNodes().length).toBe(1);

      tree.clearSelection();

      //Check model
      expect(tree.selectedNodeIds.length).toBe(0);

      //Check gui
      expect(tree._findSelectedNodes().length).toBe(0);
    });
  });

  describe("onModelAction", function() {

    describe("nodesDeleted event", function() {
      var model;
      var tree;
      var node0;
      var node1;
      var node2;

      function createNodesDeletedEvent(model, nodeIds, commonParentNodeId) {
        return {
          id: model.id,
          commonParentNodeId: commonParentNodeId,
          nodeIds: nodeIds,
          type: 'nodesDeleted'
        };
      }

      beforeEach(function() {
        model = createModelFixture(3, 1, true);
        tree = createTree(model);
        node0 = model.nodes[0];
        node1 = model.nodes[1];
        node2 = model.nodes[2];
      });

      describe("deleting a child", function() {

        it("updates model", function() {
          var node2Child0 = node2.childNodes[0];
          var node2Child1 = node2.childNodes[1];
          expect(tree.nodes.length).toBe(3);
          expect(tree.nodes[0]).toBe(node0);
          expect(Object.keys(tree._nodeMap).length).toBe(12);

          var message = {
            events: [createNodesDeletedEvent(model, [node2Child0.id], node2.id)]
          };
          session._processSuccessResponse(message);

          expect(tree.nodes[2].childNodes.length).toBe(2);
          expect(tree.nodes[2].childNodes[0]).toBe(node2Child1);
          expect(Object.keys(tree._nodeMap).length).toBe(11);
        });

        it("updates html document", function() {
          tree.render(session.$entryPoint);

          var node2Child0 = node2.childNodes[0];
          var node2Child1 = node2.childNodes[1];

          expect(findAllNodes(tree).length).toBe(12);
          expect(tree._findNodeById(node2Child0.id).length).toBe(1);

          //Delete a child node
          var message = {
            events: [createNodesDeletedEvent(model, [node2Child0.id], node2.id)]
          };
          session._processSuccessResponse(message);

          expect(findAllNodes(tree).length).toBe(11);
          expect(tree._findNodeById(node2Child0.id).length).toBe(0);

          expect(tree._findNodeById(node0.id).length).toBe(1);
          expect(tree._findNodeById(node0.childNodes[0].id).length).toBe(1);
          expect(tree._findNodeById(node0.childNodes[1].id).length).toBe(1);
          expect(tree._findNodeById(node0.childNodes[2].id).length).toBe(1);
        });

      });

      describe("deleting a root node", function() {
        it("updates model", function() {
          var message = {
            events: [createNodesDeletedEvent(model, [node0.id])]
          };
          session._processSuccessResponse(message);

          expect(tree.nodes.length).toBe(2);
          expect(tree.nodes[0]).toBe(node1);
          expect(Object.keys(tree._nodeMap).length).toBe(8);
        });

        it("updates html document", function() {
          tree.render(session.$entryPoint);

          var message = {
            events: [createNodesDeletedEvent(model, [node0.id])]
          };
          session._processSuccessResponse(message);

          expect(findAllNodes(tree).length).toBe(8);
          expect(tree._findNodeById(node0.id).length).toBe(0);
          expect(tree._findNodeById(node0.childNodes[0].id).length).toBe(0);
          expect(tree._findNodeById(node0.childNodes[1].id).length).toBe(0);
          expect(tree._findNodeById(node0.childNodes[2].id).length).toBe(0);
        });
      });

      describe("deleting all nodes", function() {
        it("updates model", function() {
          var message = {
            events: [createNodesDeletedEvent(model, [node0.id, node1.id, node2.id])]
          };
          session._processSuccessResponse(message);

          expect(tree.nodes.length).toBe(0);
          expect(Object.keys(tree._nodeMap).length).toBe(0);
        });

        it("updates html document", function() {
          tree.render(session.$entryPoint);

          var message = {
            events: [createNodesDeletedEvent(model, [node0.id, node1.id, node2.id])]
          };
          session._processSuccessResponse(message);

          expect(findAllNodes(tree).length).toBe(0);
        });
      });

    });

    describe("allNodesDeleted event", function() {
      var model;
      var tree;
      var node0;
      var node1;
      var node2;
      var node1Child0;
      var node1Child1;
      var node1Child2;

      function createAllNodesDeletedEvent(model, commonParentNodeId) {
        return {
          id: model.id,
          commonParentNodeId: commonParentNodeId,
          type: 'allNodesDeleted'
        };
      }


      beforeEach(function() {
        model = createModelFixture(3, 1, true);
        tree = createTree(model);
        node0 = model.nodes[0];
        node1 = model.nodes[1];
        node2 = model.nodes[2];
        node1Child0 = node1.childNodes[0];
        node1Child1 = node1.childNodes[1];
        node1Child2 = node1.childNodes[1];
      });

      it("deletes all nodes from model", function() {
        expect(tree.nodes.length).toBe(3);
        expect(Object.keys(tree._nodeMap).length).toBe(12);

        var message = {
          events: [createAllNodesDeletedEvent(model)]
        };
        session._processSuccessResponse(message);

        expect(tree.nodes.length).toBe(0);
        expect(Object.keys(tree._nodeMap).length).toBe(0);
      });

      it("deletes all nodes from html document", function() {
        tree.render(session.$entryPoint);

        expect(findAllNodes(tree).length).toBe(12);

        var message = {
          events: [createAllNodesDeletedEvent(model)]
        };
        session._processSuccessResponse(message);

        expect(findAllNodes(tree).length).toBe(0);
      });

      it("deletes all nodes from model for a given parent", function() {
        expect(tree.nodes.length).toBe(3);
        expect(Object.keys(tree._nodeMap).length).toBe(12);

        var message = {
          events: [createAllNodesDeletedEvent(model, node1.id)]
        };
        session._processSuccessResponse(message);

        expect(node1.childNodes.length).toBe(0);
        expect(Object.keys(tree._nodeMap).length).toBe(9);
      });

      it("deletes all nodes from html document for a given parent", function() {
        tree.render(session.$entryPoint);

        expect(findAllNodes(tree).length).toBe(12);

        var message = {
          events: [createAllNodesDeletedEvent(model, node1.id)]
        };
        session._processSuccessResponse(message);

        expect(findAllNodes(tree).length).toBe(9);

        //Check that children are removed, parent must still exist
        expect(tree._findNodeById(node1.id).length).toBe(1);
        expect(tree._findNodeById(node1Child0.id).length).toBe(0);
        expect(tree._findNodeById(node1Child1.id).length).toBe(0);
        expect(tree._findNodeById(node1Child2.id).length).toBe(0);
      });

    });

    describe("nodesSelected event", function() {
      var model;
      var tree;
      var node0;
      var child0;
      var grandchild0;

      function createNodesSelectedEvent(model, nodeIds) {
        return {
          id: model.id,
          nodeIds: nodeIds,
          type: 'nodesSelected'
        };
      }

      beforeEach(function() {
        model = createModelFixture(3, 3, false);
        tree = createTree(model);
        node0 = model.nodes[0];
        child0 = node0.childNodes[0];
        grandchild0 = child0.childNodes[0];
      });

      it("selects a node", function() {
        tree.render(session.$entryPoint);
        expect(tree._findSelectedNodes().length).toBe(0);
        expect(tree._findNodeById(node0.id).isSelected()).toBe(false);

        var message = {
          events: [createNodesSelectedEvent(model, [node0.id])]
        };
        session._processSuccessResponse(message);

        //Check model
        expect(tree.selectedNodeIds.length).toBe(1);
        expect(tree.selectedNodeIds[0]).toBe(node0.id);

        //Check gui
        expect(tree._findSelectedNodes().length).toBe(1);
        expect(tree._findNodeById(node0.id).isSelected()).toBe(true);
      });

      it("expands the parents if a hidden node should be selected whose parents are collapsed (revealing the selection)", function() {
        tree.render(session.$entryPoint);

        expect(node0.expanded).toBe(false);
        expect(child0.expanded).toBe(false);
        expect(tree._findNodeById(child0.id).length).toBe(0);

        var message = {
          events: [createNodesSelectedEvent(model, [grandchild0.id])]
        };
        session._processSuccessResponse(message);

        expect(node0.expanded).toBe(true);
        expect(child0.expanded).toBe(true);
        expect(tree._findSelectedNodes().length).toBe(1);
        expect(tree._findNodeById(grandchild0.id).isSelected()).toBe(true);

        sendQueuedAjaxCalls();

        var requestData = mostRecentJsonRequest();
        var event0 = new scout.Event('nodeExpanded', tree.id, {"nodeId": node0.id, expanded: true});
        var event1 = new scout.Event('nodeExpanded', tree.id, {"nodeId": child0.id, expanded: true});
        expect(mostRecentJsonRequest()).toContainEvents([event0, event1]);
      });

      it("does not send events if called when processing response", function() {
        tree.render(session.$entryPoint);

        var message = {
            events: [createNodesSelectedEvent(model, [node0.id])]
          };
        session._processSuccessResponse(message);

        sendQueuedAjaxCalls();
        expect(jasmine.Ajax.requests.count()).toBe(0);
      });
    });
  });
});
