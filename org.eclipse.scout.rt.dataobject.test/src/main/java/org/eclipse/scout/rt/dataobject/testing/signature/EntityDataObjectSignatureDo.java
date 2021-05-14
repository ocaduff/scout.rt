/*
 * Copyright (c) 2010-2021 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.dataobject.testing.signature;

import java.util.Collection;
import java.util.List;

import javax.annotation.Generated;

import org.eclipse.scout.rt.dataobject.DoEntity;
import org.eclipse.scout.rt.dataobject.DoList;
import org.eclipse.scout.rt.dataobject.DoValue;
import org.eclipse.scout.rt.dataobject.TypeName;

@TypeName("scout.EntityDataObjectSignature")
public class EntityDataObjectSignatureDo extends DoEntity {

  public DoValue<String> typeName() {
    return doValue("typeName");
  }

  public DoValue<String> typeVersion() {
    return doValue("typeVersion");
  }

  /**
   * Type version from replaced data object (if any).
   */
  public DoValue<String> parentTypeVersion() {
    return doValue("parentTypeVersion");
  }

  public DoList<AttributeDataObjectSignatureDo> attributes() {
    return doList("attributes");
  }

  /* **************************************************************************
   * GENERATED CONVENIENCE METHODS
   * *************************************************************************/

  @Generated("DoConvenienceMethodsGenerator")
  public EntityDataObjectSignatureDo withTypeName(String typeName) {
    typeName().set(typeName);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public String getTypeName() {
    return typeName().get();
  }

  @Generated("DoConvenienceMethodsGenerator")
  public EntityDataObjectSignatureDo withTypeVersion(String typeVersion) {
    typeVersion().set(typeVersion);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public String getTypeVersion() {
    return typeVersion().get();
  }

  @Generated("DoConvenienceMethodsGenerator")
  public EntityDataObjectSignatureDo withParentTypeVersion(String parentTypeVersion) {
    parentTypeVersion().set(parentTypeVersion);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public String getParentTypeVersion() {
    return parentTypeVersion().get();
  }

  @Generated("DoConvenienceMethodsGenerator")
  public EntityDataObjectSignatureDo withAttributes(Collection<? extends AttributeDataObjectSignatureDo> attributes) {
    attributes().updateAll(attributes);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public EntityDataObjectSignatureDo withAttributes(AttributeDataObjectSignatureDo... attributes) {
    attributes().updateAll(attributes);
    return this;
  }

  @Generated("DoConvenienceMethodsGenerator")
  public List<AttributeDataObjectSignatureDo> getAttributes() {
    return attributes().get();
  }
}