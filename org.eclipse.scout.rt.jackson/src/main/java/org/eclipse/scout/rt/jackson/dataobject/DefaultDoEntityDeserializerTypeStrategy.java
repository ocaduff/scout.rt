/*
 * Copyright (c) 2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.jackson.dataobject;

import java.util.Collection;
import java.util.Optional;

import org.eclipse.scout.rt.dataobject.DataObjectInventory;
import org.eclipse.scout.rt.dataobject.IDoEntity;
import org.eclipse.scout.rt.dataobject.IDoEntityContribution;
import org.eclipse.scout.rt.platform.Bean;
import org.eclipse.scout.rt.platform.namespace.NamespaceVersion;
import org.eclipse.scout.rt.platform.util.CollectionUtility;
import org.eclipse.scout.rt.platform.util.LazyValue;

import com.fasterxml.jackson.databind.JavaType;

@Bean
public class DefaultDoEntityDeserializerTypeStrategy implements IDoEntityDeserializerTypeStrategy {

  protected final LazyValue<DataObjectInventory> m_dataObjectInventory = new LazyValue<>(DataObjectInventory.class);

  @Override
  public Class<? extends IDoEntity> resolveTypeName(String entityType) {
    return m_dataObjectInventory.get().fromTypeName(entityType);
  }

  @Override
  public String resolveTypeVersion(Class<? extends IDoEntity> entityClass) {
    NamespaceVersion typeVersion = m_dataObjectInventory.get().getTypeVersion(entityClass);
    return typeVersion == null ? null : typeVersion.unwrap();
  }

  @Override
  public Optional<JavaType> resolveAttributeType(Class<? extends IDoEntity> entityClass, String attributeName) {
    return m_dataObjectInventory.get().getAttributeDescription(entityClass, attributeName)
        .map(a -> TypeFactoryUtility.toJavaType(a.getType()))
        .filter(type -> type.getRawClass() != Object.class);
  }

  @Override
  public void putContributions(IDoEntity doEntity, String attributeName, Collection<?> contributions) {
    // add contributions to corresponding list in do entity
    if (!CollectionUtility.isEmpty(contributions)) {
      //noinspection unchecked
      doEntity.getContributions().addAll((Collection<? extends IDoEntityContribution>) contributions);
    }
  }
}
